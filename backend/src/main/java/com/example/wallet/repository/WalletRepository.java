package com.example.wallet.repository;

import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.WalletStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    Optional<Wallet> findByWalletNumber(String walletNumber);
    Optional<Wallet> findByUserId(Long userId);
    Optional<Wallet> findByUserEmail(String email);
    long countByStatus(WalletStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id = :id")
    Optional<Wallet> findByIdForUpdate(@Param("id") Long id);
}
