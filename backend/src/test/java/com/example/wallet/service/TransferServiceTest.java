package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.TransferRequest;
import com.example.wallet.dto.response.TransferResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.TransactionStatus;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.exception.InactiveWalletException;
import com.example.wallet.exception.InsufficientBalanceException;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.UserNotFoundException;
import com.example.wallet.idempotency.IdempotencyService;
import com.example.wallet.ledger.LedgerService;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private LedgerService ledgerService;
    @Mock
    private AuditService auditService;
    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private TransferService transferService;

    private User sender;
    private User receiver;
    private Wallet senderWallet;
    private Wallet receiverWallet;

    @BeforeEach
    void setUp() {
        sender = User.builder()
                .id(1L)
                .userNumber("1000002")
                .email("alice@wallet.local")
                .fullName("Alice")
                .role(Role.ROLE_CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        receiver = User.builder()
                .id(2L)
                .userNumber("1000003")
                .email("bob@wallet.local")
                .fullName("Bob")
                .role(Role.ROLE_CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        senderWallet = Wallet.builder()
                .id(10L)
                .walletNumber("WLT-ALICE-1001")
                .user(sender)
                .balance(new BigDecimal("1000.00"))
                .currency("INR")
                .status(WalletStatus.ACTIVE)
                .build();

        receiverWallet = Wallet.builder()
                .id(20L)
                .walletNumber("WLT-BOB-1001")
                .user(receiver)
                .balance(new BigDecimal("500.00"))
                .currency("INR")
                .status(WalletStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Should successfully transfer funds between two active users")
    void testTransferMoney_Success() {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("400.00"))
                .note("Lunch share")
                .build();

        when(idempotencyService.checkAndRegister(any(), any(), any())).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findByEmailOrUserNumber("bob@wallet.local")).thenReturn(Optional.of(receiver));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByUserId(2L)).thenReturn(Optional.of(receiverWallet));
        when(walletRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(receiverWallet));

        Transaction savedTxn = Transaction.builder()
                .id(100L)
                .referenceNumber("TXN-12345")
                .senderWallet(senderWallet)
                .receiverWallet(receiverWallet)
                .amount(new BigDecimal("400.00"))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTxn);

        TransferResponse response = transferService.transferMoney(1L, request, "key-123");

        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo("400.00");
        assertThat(response.getStatus()).isEqualTo(TransactionStatus.SUCCESS);
        assertThat(senderWallet.getBalance()).isEqualByComparingTo("600.00");
        assertThat(receiverWallet.getBalance()).isEqualByComparingTo("900.00");

        verify(ledgerService, times(2)).recordEntry(any(), any(), any(), any(), any(), any());
        verify(ledgerService).verifyDoubleEntryBalance(100L);
        verify(idempotencyService).markCompleted(eq("key-123"), any(), eq(200));
    }

    @Test
    @DisplayName("Should successfully transfer funds using recipient 7-digit User ID")
    void testTransferMoney_Using7DigitUserId_Success() {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("1000003")
                .amount(new BigDecimal("300.00"))
                .note("Payment via User ID")
                .build();

        when(idempotencyService.checkAndRegister(any(), any(), any())).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findByEmailOrUserNumber("1000003")).thenReturn(Optional.of(receiver));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByUserId(2L)).thenReturn(Optional.of(receiverWallet));
        when(walletRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(receiverWallet));

        Transaction savedTxn = Transaction.builder()
                .id(101L)
                .referenceNumber("TXN-12346")
                .senderWallet(senderWallet)
                .receiverWallet(receiverWallet)
                .amount(new BigDecimal("300.00"))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTxn);

        TransferResponse response = transferService.transferMoney(1L, request, "key-124");

        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo("300.00");
        assertThat(response.getReceiverUserNumber()).isEqualTo("1000003");
        assertThat(senderWallet.getBalance()).isEqualByComparingTo("700.00");
        assertThat(receiverWallet.getBalance()).isEqualByComparingTo("800.00");
    }

    @Test
    @DisplayName("Should fail when sender has insufficient funds")
    void testTransferMoney_InsufficientFunds() {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("2000.00"))
                .build();

        when(idempotencyService.checkAndRegister(any(), any(), any())).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findByEmailOrUserNumber("bob@wallet.local")).thenReturn(Optional.of(receiver));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByUserId(2L)).thenReturn(Optional.of(receiverWallet));
        when(walletRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(receiverWallet));

        assertThatThrownBy(() -> transferService.transferMoney(1L, request, "key-456"))
                .isInstanceOf(InsufficientBalanceException.class)
                .hasMessageContaining("Insufficient funds");

        assertThat(senderWallet.getBalance()).isEqualByComparingTo("1000.00");
        assertThat(receiverWallet.getBalance()).isEqualByComparingTo("500.00");
        verify(idempotencyService).markFailed("key-456");
    }

    @Test
    @DisplayName("Should fail when attempting to transfer to self")
    void testTransferMoney_SelfTransfer() {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("alice@wallet.local")
                .amount(new BigDecimal("100.00"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findByEmailOrUserNumber("alice@wallet.local")).thenReturn(Optional.of(sender));

        assertThatThrownBy(() -> transferService.transferMoney(1L, request, null))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessageContaining("Cannot transfer money to yourself");
    }

    @Test
    @DisplayName("Should fail when sender wallet is inactive")
    void testTransferMoney_InactiveSenderWallet() {
        senderWallet.setStatus(WalletStatus.INACTIVE);

        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("100.00"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findByEmailOrUserNumber("bob@wallet.local")).thenReturn(Optional.of(receiver));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(senderWallet));
        when(walletRepository.findByUserId(2L)).thenReturn(Optional.of(receiverWallet));

        assertThatThrownBy(() -> transferService.transferMoney(1L, request, null))
                .isInstanceOf(InactiveWalletException.class)
                .hasMessageContaining("Sender wallet is inactive");
    }

    @Test
    @DisplayName("Should return cached response on idempotent re-submission")
    void testTransferMoney_IdempotencyReplay() {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("100.00"))
                .build();

        TransferResponse cachedResponse = TransferResponse.builder()
                .transactionReference("TXN-CACHED-999")
                .amount(new BigDecimal("100.00"))
                .status(TransactionStatus.SUCCESS)
                .build();

        when(idempotencyService.checkAndRegister(eq("idem-key-1"), any(), eq(TransferResponse.class)))
                .thenReturn(Optional.of(cachedResponse));

        TransferResponse result = transferService.transferMoney(1L, request, "idem-key-1");

        assertThat(result).isSameAs(cachedResponse);
        verifyNoInteractions(walletRepository);
        verifyNoInteractions(transactionRepository);
    }
}
