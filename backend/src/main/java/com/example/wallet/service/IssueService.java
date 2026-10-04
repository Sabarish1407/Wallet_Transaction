package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.CreateIssueRequest;
import com.example.wallet.dto.request.UpdateIssueStatusRequest;
import com.example.wallet.dto.response.IssueResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.TransactionIssue;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.ActivityType;
import com.example.wallet.enums.IssueStatus;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.IssueNotFoundException;
import com.example.wallet.exception.UnauthorizedTransactionAccessException;
import com.example.wallet.exception.UserNotFoundException;
import com.example.wallet.exception.WalletNotFoundException;
import com.example.wallet.repository.TransactionIssueRepository;
import com.example.wallet.repository.TransactionRepository;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IssueService {

    private final TransactionIssueRepository issueRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final AuditService auditService;

    private final SecureRandom random = new SecureRandom();

    public String generateIssueReference() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return "ISSUE-" + timestamp + "-" + (1000 + random.nextInt(9000));
    }

    @Transactional
    public IssueResponse createIssue(Long userId, CreateIssueRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));

        Transaction transaction = transactionRepository.findByReferenceNumber(request.getTransactionReference().trim())
                .orElseThrow(() -> new InvalidTransactionException("Transaction not found with reference: " + request.getTransactionReference()));

        Wallet userWallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));

        boolean isParty = transaction.getSenderWallet().getId().equals(userWallet.getId()) ||
                          transaction.getReceiverWallet().getId().equals(userWallet.getId());

        if (!isParty) {
            throw new UnauthorizedTransactionAccessException("You cannot report an issue on a transaction that does not belong to your wallet");
        }

        TransactionIssue issue = TransactionIssue.builder()
                .issueReference(generateIssueReference())
                .transaction(transaction)
                .reportedBy(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(IssueStatus.OPEN)
                .build();

        TransactionIssue saved = issueRepository.save(issue);

        auditService.logActivity(
                userId,
                user.getEmail(),
                ActivityType.ISSUE_CREATED,
                "Reported issue " + saved.getIssueReference() + " for transaction " + transaction.getReferenceNumber(),
                "TransactionIssue",
                saved.getId().toString(),
                null,
                IssueStatus.OPEN.name(),
                "SUCCESS",
                null
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<IssueResponse> getUserIssues(Long userId) {
        return issueRepository.findByReportedByIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public IssueResponse getIssueByReference(String issueReference, Long requestingUserId, boolean isAdmin) {
        TransactionIssue issue = issueRepository.findByIssueReference(issueReference)
                .orElseThrow(() -> new IssueNotFoundException("Issue not found with reference: " + issueReference));

        if (!isAdmin && !issue.getReportedBy().getId().equals(requestingUserId)) {
            throw new UnauthorizedTransactionAccessException("You are not authorized to view this issue");
        }

        return toResponse(issue);
    }

    @Transactional(readOnly = true)
    public Page<IssueResponse> getAllIssues(IssueStatus status, String query, Pageable pageable) {
        Page<TransactionIssue> page;
        if (query != null && !query.trim().isEmpty()) {
            page = issueRepository.searchIssues(query.trim(), pageable);
        } else if (status != null) {
            page = issueRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            page = issueRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional
    public IssueResponse updateIssueStatus(Long adminUserId, Long issueId, UpdateIssueStatusRequest request) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new UserNotFoundException("Admin not found"));

        TransactionIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new IssueNotFoundException("Issue not found with ID: " + issueId));

        IssueStatus oldStatus = issue.getStatus();
        issue.setStatus(request.getStatus());

        if (request.getResolutionNotes() != null && !request.getResolutionNotes().trim().isEmpty()) {
            issue.setResolutionNotes(request.getResolutionNotes().trim());
        }

        if (request.getStatus() == IssueStatus.RESOLVED) {
            issue.setResolvedBy(admin);
            issue.setResolvedAt(LocalDateTime.now());
        }

        TransactionIssue saved = issueRepository.save(issue);

        auditService.logActivity(
                adminUserId,
                admin.getEmail(),
                ActivityType.ISSUE_UPDATED,
                String.format("Issue %s status updated from %s to %s", issue.getIssueReference(), oldStatus, request.getStatus()),
                "TransactionIssue",
                saved.getId().toString(),
                oldStatus.name(),
                request.getStatus().name(),
                "SUCCESS",
                null
        );

        return toResponse(saved);
    }

    public IssueResponse toResponse(TransactionIssue issue) {
        return IssueResponse.builder()
                .id(issue.getId())
                .issueReference(issue.getIssueReference())
                .transactionReference(issue.getTransaction().getReferenceNumber())
                .transactionAmount(issue.getTransaction().getAmount())
                .reportedByEmail(issue.getReportedBy().getEmail())
                .reportedByName(issue.getReportedBy().getFullName())
                .title(issue.getTitle())
                .description(issue.getDescription())
                .status(issue.getStatus())
                .resolutionNotes(issue.getResolutionNotes())
                .resolvedByEmail(issue.getResolvedBy() != null ? issue.getResolvedBy().getEmail() : null)
                .resolvedAt(issue.getResolvedAt())
                .createdAt(issue.getCreatedAt())
                .build();
    }
}
