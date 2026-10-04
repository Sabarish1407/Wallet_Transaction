package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.TopUpRequest;
import com.example.wallet.dto.response.WalletResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.exception.InactiveWalletException;
import com.example.wallet.idempotency.IdempotencyService;
import com.example.wallet.ledger.LedgerService;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

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
    private WalletService walletService;

    private User user;
    private Wallet userWallet;
    private Wallet treasuryWallet;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(walletService, "treasuryWalletNumber", "WLT-TREASURY-0000");

        user = User.builder()
                .id(1L)
                .email("alice@wallet.local")
                .fullName("Alice")
                .build();

        userWallet = Wallet.builder()
                .id(10L)
                .walletNumber("WLT-ALICE-1001")
                .user(user)
                .balance(new BigDecimal("100.00"))
                .status(WalletStatus.ACTIVE)
                .build();

        treasuryWallet = Wallet.builder()
                .id(999L)
                .walletNumber("WLT-TREASURY-0000")
                .balance(new BigDecimal("10000000.00"))
                .status(WalletStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Should successfully top up customer wallet and credit ledger")
    void testTopUpWallet_Success() {
        TopUpRequest request = TopUpRequest.builder()
                .amount(new BigDecimal("500.00"))
                .note("Salary deposit")
                .build();

        when(idempotencyService.checkAndRegister(any(), any(), any())).thenReturn(Optional.empty());
        when(walletRepository.findByWalletNumber("WLT-TREASURY-0000")).thenReturn(Optional.of(treasuryWallet));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(userWallet));
        when(walletRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userWallet));

        Transaction savedTxn = Transaction.builder()
                .id(200L)
                .referenceNumber("TXN-TOPUP-1")
                .amount(new BigDecimal("500.00"))
                .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTxn);

        WalletResponse response = walletService.topUpWallet(1L, request, "topup-key-1");

        assertThat(response).isNotNull();
        assertThat(userWallet.getBalance()).isEqualByComparingTo("600.00");
        verify(ledgerService, times(2)).recordEntry(any(), any(), any(), any(), any(), any());
        verify(ledgerService).verifyDoubleEntryBalance(200L);
        verify(idempotencyService).markCompleted(eq("topup-key-1"), any(), eq(200));
    }

    @Test
    @DisplayName("Should reject top up on inactive wallet")
    void testTopUpWallet_InactiveWallet() {
        userWallet.setStatus(WalletStatus.INACTIVE);
        TopUpRequest request = TopUpRequest.builder()
                .amount(new BigDecimal("500.00"))
                .build();

        when(idempotencyService.checkAndRegister(any(), any(), any())).thenReturn(Optional.empty());
        when(walletRepository.findByWalletNumber("WLT-TREASURY-0000")).thenReturn(Optional.of(treasuryWallet));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(userWallet));
        when(walletRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(userWallet));

        assertThatThrownBy(() -> walletService.topUpWallet(1L, request, "topup-key-2"))
                .isInstanceOf(InactiveWalletException.class);
    }
}
