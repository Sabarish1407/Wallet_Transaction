package com.example.wallet.ledger;

import com.example.wallet.entity.LedgerEntry;
import com.example.wallet.enums.LedgerEntryType;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.repository.LedgerEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LedgerServiceTest {

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @InjectMocks
    private LedgerService ledgerService;

    @Test
    @DisplayName("Should pass verification when total debits equal total credits")
    void testVerifyDoubleEntryBalance_Balanced() {
        Long txnId = 100L;
        when(ledgerEntryRepository.sumAmountByTransactionIdAndType(txnId, LedgerEntryType.DEBIT))
                .thenReturn(new BigDecimal("500.00"));
        when(ledgerEntryRepository.sumAmountByTransactionIdAndType(txnId, LedgerEntryType.CREDIT))
                .thenReturn(new BigDecimal("500.00"));

        assertThatCode(() -> ledgerService.verifyDoubleEntryBalance(txnId))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Should throw InvalidTransactionException when debits do not equal credits")
    void testVerifyDoubleEntryBalance_Unbalanced() {
        Long txnId = 101L;
        when(ledgerEntryRepository.sumAmountByTransactionIdAndType(txnId, LedgerEntryType.DEBIT))
                .thenReturn(new BigDecimal("500.00"));
        when(ledgerEntryRepository.sumAmountByTransactionIdAndType(txnId, LedgerEntryType.CREDIT))
                .thenReturn(new BigDecimal("400.00"));

        assertThatThrownBy(() -> ledgerService.verifyDoubleEntryBalance(txnId))
                .isInstanceOf(InvalidTransactionException.class)
                .hasMessageContaining("Double-entry invariant violated");
    }

    @Test
    @DisplayName("Should prevent updates to ledger entry entity (Immutability guarantee)")
    void testLedgerEntry_ImmutabilityOnUpdate() {
        LedgerEntry entry = new LedgerEntry();
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(entry, "onPreUpdate"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("immutable and cannot be updated");
    }

    @Test
    @DisplayName("Should prevent deletions of ledger entry entity (Immutability guarantee)")
    void testLedgerEntry_ImmutabilityOnRemove() {
        LedgerEntry entry = new LedgerEntry();
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(entry, "onPreRemove"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("immutable and cannot be deleted");
    }
}
