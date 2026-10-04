package com.example.wallet.ledger;

import com.example.wallet.dto.response.LedgerEntryResponse;
import com.example.wallet.entity.LedgerEntry;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.LedgerEntryType;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;

    @Transactional
    public LedgerEntry recordEntry(Transaction transaction,
                                   Wallet wallet,
                                   LedgerEntryType entryType,
                                   BigDecimal amount,
                                   BigDecimal balanceAfter,
                                   String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Ledger entry amount must be strictly greater than zero");
        }

        LedgerEntry entry = LedgerEntry.builder()
                .transaction(transaction)
                .wallet(wallet)
                .entryType(entryType)
                .amount(amount.setScale(2))
                .balanceAfter(balanceAfter.setScale(2))
                .description(description)
                .build();

        LedgerEntry saved = ledgerEntryRepository.save(entry);
        log.info("Ledger entry recorded: txn={} wallet={} type={} amount={} balanceAfter={}",
                transaction.getReferenceNumber(), wallet.getWalletNumber(), entryType, amount, balanceAfter);
        return saved;
    }

    /**
     * Invariant check: In double-entry bookkeeping, SUM(Debits) must equal SUM(Credits).
     */
    @Transactional(readOnly = true)
    public void verifyDoubleEntryBalance(Long transactionId) {
        BigDecimal totalDebits = ledgerEntryRepository.sumAmountByTransactionIdAndType(transactionId, LedgerEntryType.DEBIT);
        BigDecimal totalCredits = ledgerEntryRepository.sumAmountByTransactionIdAndType(transactionId, LedgerEntryType.CREDIT);

        if (totalDebits.compareTo(totalCredits) != 0) {
            log.error("CRITICAL INVARIANT VIOLATION: Transaction ID {} has unbalanced ledger! Debits={}, Credits={}",
                    transactionId, totalDebits, totalCredits);
            throw new InvalidTransactionException(
                    String.format("Double-entry invariant violated! Debits (%s) != Credits (%s)", totalDebits, totalCredits)
            );
        }
        log.info("Double-entry verified for txnId {}: Debits={} Credits={}", transactionId, totalDebits, totalCredits);
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryResponse> getEntriesForTransaction(Long transactionId) {
        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionIdOrderByCreatedAtAsc(transactionId);
        return entries.stream().map(this::toResponse).toList();
    }

    public LedgerEntryResponse toResponse(LedgerEntry entry) {
        return LedgerEntryResponse.builder()
                .id(entry.getId())
                .walletNumber(entry.getWallet().getWalletNumber())
                .userEmail(entry.getWallet().getUser() != null ? entry.getWallet().getUser().getEmail() : "SYSTEM")
                .userFullName(entry.getWallet().getUser() != null ? entry.getWallet().getUser().getFullName() : "System Gateway")
                .entryType(entry.getEntryType())
                .amount(entry.getAmount())
                .balanceAfter(entry.getBalanceAfter())
                .description(entry.getDescription())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
