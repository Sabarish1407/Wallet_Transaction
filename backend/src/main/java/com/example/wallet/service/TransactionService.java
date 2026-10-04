package com.example.wallet.service;

import com.example.wallet.dto.response.LedgerEntryResponse;
import com.example.wallet.dto.response.TransactionResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.Wallet;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.UnauthorizedTransactionAccessException;
import com.example.wallet.exception.WalletNotFoundException;
import com.example.wallet.ledger.LedgerService;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final LedgerService ledgerService;

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getCustomerTransactions(Long userId, Pageable pageable) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user ID: " + userId));

        Page<Transaction> transactions = transactionRepository.findByWalletId(wallet.getId(), pageable);
        return transactions.map(txn -> toResponse(txn, wallet.getId()));
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionByReference(String referenceNumber, Long requestingUserId, boolean isAdmin) {
        Transaction transaction = transactionRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new InvalidTransactionException("Transaction not found with reference: " + referenceNumber));

        Long userWalletId = null;
        if (!isAdmin) {
            Wallet wallet = walletRepository.findByUserId(requestingUserId)
                    .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));
            userWalletId = wallet.getId();

            boolean isPartyToTxn = transaction.getSenderWallet().getId().equals(userWalletId) ||
                                   transaction.getReceiverWallet().getId().equals(userWalletId);
            if (!isPartyToTxn) {
                throw new UnauthorizedTransactionAccessException("You are not authorized to view this transaction");
            }
        }

        return toResponse(transaction, userWalletId);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAllTransactions(String search, Pageable pageable) {
        Page<Transaction> page;
        if (search != null && !search.trim().isEmpty()) {
            page = transactionRepository.searchByReference(search.trim(), pageable);
        } else {
            page = transactionRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(txn -> toResponse(txn, null));
    }

    public TransactionResponse toResponse(Transaction txn, Long userWalletId) {
        String roleInTxn = null;
        if (userWalletId != null) {
            if (txn.getSenderWallet().getId().equals(userWalletId)) {
                roleInTxn = "DEBIT";
            } else if (txn.getReceiverWallet().getId().equals(userWalletId)) {
                roleInTxn = "CREDIT";
            }
        }

        List<LedgerEntryResponse> ledgerEntries = ledgerService.getEntriesForTransaction(txn.getId());

        return TransactionResponse.builder()
                .id(txn.getId())
                .referenceNumber(txn.getReferenceNumber())
                .senderEmail(txn.getSenderWallet().getUser() != null ? txn.getSenderWallet().getUser().getEmail() : "SYSTEM_TREASURY")
                .senderName(txn.getSenderWallet().getUser() != null ? txn.getSenderWallet().getUser().getFullName() : "System Clearing Gateway")
                .senderWalletNumber(txn.getSenderWallet().getWalletNumber())
                .receiverEmail(txn.getReceiverWallet().getUser() != null ? txn.getReceiverWallet().getUser().getEmail() : "SYSTEM")
                .receiverName(txn.getReceiverWallet().getUser() != null ? txn.getReceiverWallet().getUser().getFullName() : "System")
                .receiverWalletNumber(txn.getReceiverWallet().getWalletNumber())
                .type(txn.getType())
                .amount(txn.getAmount())
                .status(txn.getStatus())
                .note(txn.getNote())
                .failureReason(txn.getFailureReason())
                .userRoleInTxn(roleInTxn)
                .createdAt(txn.getCreatedAt())
                .ledgerEntries(ledgerEntries)
                .build();
    }
}
