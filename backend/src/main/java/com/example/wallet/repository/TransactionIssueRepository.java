package com.example.wallet.repository;

import com.example.wallet.entity.TransactionIssue;
import com.example.wallet.enums.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionIssueRepository extends JpaRepository<TransactionIssue, Long> {
    Optional<TransactionIssue> findByIssueReference(String issueReference);
    List<TransactionIssue> findByReportedByIdOrderByCreatedAtDesc(Long userId);
    List<TransactionIssue> findByTransactionId(Long transactionId);
    Page<TransactionIssue> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<TransactionIssue> findByStatusOrderByCreatedAtDesc(IssueStatus status, Pageable pageable);

    @Query("SELECT i FROM TransactionIssue i WHERE " +
           "LOWER(i.issueReference) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(i.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY i.createdAt DESC")
    Page<TransactionIssue> searchIssues(@Param("query") String query, Pageable pageable);

    long countByStatus(IssueStatus status);
}
