package com.example.wallet.repository;

import com.example.wallet.entity.AuditLog;
import com.example.wallet.enums.ActivityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<AuditLog> findByActivityTypeOrderByCreatedAtDesc(ActivityType activityType, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:activityType IS NULL OR a.activityType = :activityType) AND " +
           "(:query IS NULL OR LOWER(a.userEmail) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.activityDescription) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.entityName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> searchAuditLogs(@Param("activityType") ActivityType activityType,
                                   @Param("query") String query,
                                   Pageable pageable);
}
