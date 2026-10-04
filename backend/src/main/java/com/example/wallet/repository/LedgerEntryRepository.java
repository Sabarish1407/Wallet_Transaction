package com.example.wallet.repository;

import com.example.wallet.entity.LedgerEntry;
import com.example.wallet.enums.LedgerEntryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByTransactionIdOrderByCreatedAtAsc(Long transactionId);
    Page<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.transaction.id = :transactionId AND l.entryType = :type")
    BigDecimal sumAmountByTransactionIdAndType(@Param("transactionId") Long transactionId, @Param("type") LedgerEntryType type);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.entryType = :type")
    BigDecimal sumTotalByEntryType(@Param("type") LedgerEntryType type);
}
