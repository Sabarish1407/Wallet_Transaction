package com.example.wallet.repository;

import com.example.wallet.entity.Transaction;
import com.example.wallet.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByReferenceNumber(String referenceNumber);
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT t FROM Transaction t WHERE t.senderWallet.id = :walletId OR t.receiverWallet.id = :walletId ORDER BY t.createdAt DESC")
    Page<Transaction> findByWalletId(@Param("walletId") Long walletId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE " +
           "(t.senderWallet.id = :walletId OR t.receiverWallet.id = :walletId) AND " +
           "t.status = :status ORDER BY t.createdAt DESC")
    Page<Transaction> findByWalletIdAndStatus(@Param("walletId") Long walletId, @Param("status") TransactionStatus status, Pageable pageable);

    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE LOWER(t.referenceNumber) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY t.createdAt DESC")
    Page<Transaction> searchByReference(@Param("query") String query, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.status = 'SUCCESS'")
    BigDecimal calculateTotalSuccessfulVolume();

    long countByStatus(TransactionStatus status);
}
