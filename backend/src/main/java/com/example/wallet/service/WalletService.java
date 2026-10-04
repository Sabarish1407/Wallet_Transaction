package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.TopUpRequest;
import com.example.wallet.dto.response.WalletResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.ActivityType;
import com.example.wallet.enums.LedgerEntryType;
import com.example.wallet.enums.TransactionStatus;
import com.example.wallet.enums.TransactionType;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.exception.InactiveWalletException;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.WalletNotFoundException;
import com.example.wallet.idempotency.IdempotencyService;
import com.example.wallet.ledger.LedgerService;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerService ledgerService;
    private final AuditService auditService;
    private final IdempotencyService idempotencyService;

    @Value("${app.treasury.wallet-number:WLT-TREASURY-0000}")
    private String treasuryWalletNumber;

    private final SecureRandom random = new SecureRandom();

    public String generateWalletNumber() {
        return "WLT-" + System.currentTimeMillis() + "-" + (1000 + random.nextInt(9000));
    }

    public String generateTransactionReference() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "TXN-" + timestamp + "-" + (1000 + random.nextInt(9000));
    }

    @Transactional
    public Wallet createWalletForUser(User user) {
        Wallet wallet = Wallet.builder()
                .walletNumber(generateWalletNumber())
                .user(user)
                .balance(BigDecimal.ZERO.setScale(2))
                .currency("INR")
                .status(WalletStatus.ACTIVE)
                .build();

        Wallet saved = walletRepository.save(wallet);
        auditService.logActivity(
                user.getId(),
                user.getEmail(),
                ActivityType.WALLET_CREATED,
                "Wallet created with number " + saved.getWalletNumber(),
                "Wallet",
                saved.getId().toString(),
                null,
                "0.00",
                "SUCCESS",
                null
        );
        return saved;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user ID: " + userId));
        return toResponse(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserEmail(String email) {
        Wallet wallet = walletRepository.findByUserEmail(email)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user email: " + email));
        return toResponse(wallet);
    }

    @Transactional
    public WalletResponse topUpWallet(Long userId, TopUpRequest request, String idempotencyKey) {
        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Top-up amount must be greater than zero");
        }

        // Check idempotency
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<WalletResponse> cached = idempotencyService.checkAndRegister(
                    idempotencyKey,
                    "TOP_UP:" + userId + ":" + amount,
                    WalletResponse.class
            );
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        try {
            // Find Treasury Wallet
            Wallet treasuryWallet = walletRepository.findByWalletNumber(treasuryWalletNumber)
                    .orElseThrow(() -> new WalletNotFoundException("System Treasury wallet not found"));

            // Lock customer wallet
            Wallet customerWallet = walletRepository.findByUserId(userId)
                    .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user ID: " + userId));

            Wallet lockedCustomerWallet = walletRepository.findByIdForUpdate(customerWallet.getId())
                    .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));

            if (lockedCustomerWallet.getStatus() != WalletStatus.ACTIVE) {
                throw new InactiveWalletException("Cannot top up an inactive wallet");
            }

            BigDecimal initialBalance = lockedCustomerWallet.getBalance();
            BigDecimal newBalance = initialBalance.add(amount).setScale(2);
            lockedCustomerWallet.setBalance(newBalance);
            walletRepository.save(lockedCustomerWallet);

            // Record transaction
            String txnRef = generateTransactionReference();
            Transaction transaction = Transaction.builder()
                    .referenceNumber(txnRef)
                    .senderWallet(treasuryWallet)
                    .receiverWallet(lockedCustomerWallet)
                    .type(TransactionType.TOP_UP)
                    .amount(amount.setScale(2))
                    .status(TransactionStatus.SUCCESS)
                    .note(request.getNote() != null ? request.getNote() : "Wallet Top-up")
                    .idempotencyKey(idempotencyKey)
                    .build();

            Transaction savedTxn = transactionRepository.save(transaction);

            // Double-entry ledger: Debit Treasury, Credit Customer Wallet
            ledgerService.recordEntry(
                    savedTxn,
                    treasuryWallet,
                    LedgerEntryType.DEBIT,
                    amount,
                    treasuryWallet.getBalance(),
                    "Treasury debit for wallet top-up"
            );

            ledgerService.recordEntry(
                    savedTxn,
                    lockedCustomerWallet,
                    LedgerEntryType.CREDIT,
                    amount,
                    newBalance,
                    "Wallet top-up credit"
            );

            // Invariant verification
            ledgerService.verifyDoubleEntryBalance(savedTxn.getId());

            // Audit
            auditService.logActivity(
                    userId,
                    lockedCustomerWallet.getUser().getEmail(),
                    ActivityType.MONEY_ADDED,
                    String.format("Added ₹%s to wallet. New balance: ₹%s", amount, newBalance),
                    "Wallet",
                    lockedCustomerWallet.getId().toString(),
                    initialBalance.toString(),
                    newBalance.toString(),
                    "SUCCESS",
                    null
            );

            WalletResponse response = toResponse(lockedCustomerWallet);

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotencyService.markCompleted(idempotencyKey, response, 200);
            }

            return response;
        } catch (Exception e) {
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotencyService.markFailed(idempotencyKey);
            }
            throw e;
        }
    }

    public WalletResponse toResponse(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .walletNumber(wallet.getWalletNumber())
                .userId(wallet.getUser() != null ? wallet.getUser().getId() : null)
                .userNumber(wallet.getUser() != null ? wallet.getUser().getUserNumber() : null)
                .userEmail(wallet.getUser() != null ? wallet.getUser().getEmail() : null)
                .userFullName(wallet.getUser() != null ? wallet.getUser().getFullName() : null)
                .balance(wallet.getBalance())
                .currency(wallet.getCurrency())
                .status(wallet.getStatus())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }
}
