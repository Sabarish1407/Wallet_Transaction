package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.TransferRequest;
import com.example.wallet.dto.response.TransferResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.*;
import com.example.wallet.exception.InactiveWalletException;
import com.example.wallet.exception.InsufficientBalanceException;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.UserNotFoundException;
import com.example.wallet.exception.WalletNotFoundException;
import com.example.wallet.idempotency.IdempotencyService;
import com.example.wallet.ledger.LedgerService;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class TransferService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerService ledgerService;
    private final AuditService auditService;
    private final IdempotencyService idempotencyService;

    private final SecureRandom random = new SecureRandom();

    public String generateTransactionReference() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "TXN-" + timestamp + "-" + (1000 + random.nextInt(9000));
    }

    @Transactional
    public TransferResponse transferMoney(Long senderUserId, TransferRequest request, String idempotencyKey) {
        BigDecimal amount = request.getAmount();

        // 1. Basic Validations
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Transfer amount must be strictly greater than zero");
        }

        String receiverIdentifier = request.getReceiverIdentifier();

        // 2. Idempotency Check
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<TransferResponse> cached = idempotencyService.checkAndRegister(
                    idempotencyKey,
                    "TRANSFER:" + senderUserId + ":" + receiverIdentifier + ":" + amount,
                    TransferResponse.class
            );
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        try {
            // 3. User Existence & State Validations
            User sender = userRepository.findById(senderUserId)
                    .orElseThrow(() -> new UserNotFoundException("Sender user not found"));

            if (sender.getStatus() != UserStatus.ACTIVE) {
                throw new InvalidTransactionException("Sender account is not active");
            }

            User receiver = userRepository.findByEmailOrUserNumber(receiverIdentifier)
                    .orElseThrow(() -> new UserNotFoundException("Recipient user with email or ID '" + receiverIdentifier + "' not found"));

            if (sender.getId().equals(receiver.getId()) ||
                sender.getEmail().equalsIgnoreCase(receiver.getEmail()) ||
                (sender.getUserNumber() != null && sender.getUserNumber().equals(receiver.getUserNumber()))) {
                throw new InvalidTransactionException("Cannot transfer money to yourself");
            }

            if (receiver.getStatus() != UserStatus.ACTIVE) {
                throw new InvalidTransactionException("Recipient account is inactive");
            }

            Wallet senderWallet = walletRepository.findByUserId(sender.getId())
                    .orElseThrow(() -> new WalletNotFoundException("Sender wallet not found"));

            Wallet receiverWallet = walletRepository.findByUserId(receiver.getId())
                    .orElseThrow(() -> new WalletNotFoundException("Recipient wallet not found"));

            if (senderWallet.getStatus() != WalletStatus.ACTIVE) {
                throw new InactiveWalletException("Sender wallet is inactive");
            }
            if (receiverWallet.getStatus() != WalletStatus.ACTIVE) {
                throw new InactiveWalletException("Recipient wallet is inactive");
            }

            // 4. Deterministic Lock Acquisition to prevent deadlocks
            Long firstLockId = Math.min(senderWallet.getId(), receiverWallet.getId());
            Long secondLockId = Math.max(senderWallet.getId(), receiverWallet.getId());

            Wallet lockedFirst = walletRepository.findByIdForUpdate(firstLockId)
                    .orElseThrow(() -> new WalletNotFoundException("Wallet lock acquisition failed for ID: " + firstLockId));
            Wallet lockedSecond = walletRepository.findByIdForUpdate(secondLockId)
                    .orElseThrow(() -> new WalletNotFoundException("Wallet lock acquisition failed for ID: " + secondLockId));

            Wallet lockedSender = lockedFirst.getId().equals(senderWallet.getId()) ? lockedFirst : lockedSecond;
            Wallet lockedReceiver = lockedFirst.getId().equals(receiverWallet.getId()) ? lockedFirst : lockedSecond;

            // 5. Balance Validation
            if (lockedSender.getBalance().compareTo(amount) < 0) {
                throw new InsufficientBalanceException(
                        String.format("Insufficient funds in wallet. Available: ₹%s, Requested: ₹%s",
                                lockedSender.getBalance(), amount)
                );
            }

            // 6. Balance Updates
            BigDecimal senderOldBalance = lockedSender.getBalance();
            BigDecimal senderNewBalance = senderOldBalance.subtract(amount).setScale(2);
            lockedSender.setBalance(senderNewBalance);

            BigDecimal receiverOldBalance = lockedReceiver.getBalance();
            BigDecimal receiverNewBalance = receiverOldBalance.add(amount).setScale(2);
            lockedReceiver.setBalance(receiverNewBalance);

            walletRepository.save(lockedSender);
            walletRepository.save(lockedReceiver);

            // 7. Transaction Entity Creation
            String referenceNumber = generateTransactionReference();
            Transaction transaction = Transaction.builder()
                    .referenceNumber(referenceNumber)
                    .senderWallet(lockedSender)
                    .receiverWallet(lockedReceiver)
                    .type(TransactionType.TRANSFER)
                    .amount(amount.setScale(2))
                    .status(TransactionStatus.SUCCESS)
                    .note(request.getNote())
                    .idempotencyKey(idempotencyKey)
                    .build();

            Transaction savedTransaction = transactionRepository.save(transaction);

            // 8. Double-Entry Accounting: Record Debit & Credit
            ledgerService.recordEntry(
                    savedTransaction,
                    lockedSender,
                    LedgerEntryType.DEBIT,
                    amount,
                    senderNewBalance,
                    "Debit transfer to " + receiver.getEmail() + (request.getNote() != null ? " (" + request.getNote() + ")" : "")
            );

            ledgerService.recordEntry(
                    savedTransaction,
                    lockedReceiver,
                    LedgerEntryType.CREDIT,
                    amount,
                    receiverNewBalance,
                    "Credit transfer from " + sender.getEmail() + (request.getNote() != null ? " (" + request.getNote() + ")" : "")
            );

            // 9. Invariant Verification: SUM(DEBIT) == SUM(CREDIT)
            ledgerService.verifyDoubleEntryBalance(savedTransaction.getId());

            // 10. Audit Logging
            auditService.logActivity(
                    sender.getId(),
                    sender.getEmail(),
                    ActivityType.TRANSFER_SUCCESS,
                    String.format("Transferred ₹%s to %s (Ref: %s)", amount, receiver.getEmail(), referenceNumber),
                    "Transaction",
                    savedTransaction.getId().toString(),
                    senderOldBalance.toString(),
                    senderNewBalance.toString(),
                    "SUCCESS",
                    null
            );

            TransferResponse response = TransferResponse.builder()
                    .transactionReference(referenceNumber)
                    .senderWalletNumber(lockedSender.getWalletNumber())
                    .senderUserNumber(sender.getUserNumber())
                    .senderEmail(sender.getEmail())
                    .receiverWalletNumber(lockedReceiver.getWalletNumber())
                    .receiverUserNumber(receiver.getUserNumber())
                    .receiverEmail(receiver.getEmail())
                    .amount(amount.setScale(2))
                    .status(TransactionStatus.SUCCESS)
                    .note(request.getNote())
                    .createdAt(savedTransaction.getCreatedAt())
                    .build();

            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotencyService.markCompleted(idempotencyKey, response, 200);
            }

            return response;
        } catch (Exception e) {
            log.error("Transfer failed: {}", e.getMessage());
            if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
                idempotencyService.markFailed(idempotencyKey);
            }
            throw e;
        }
    }
}
