package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.CreateIssueRequest;
import com.example.wallet.dto.request.UpdateIssueStatusRequest;
import com.example.wallet.dto.response.IssueResponse;
import com.example.wallet.entity.Transaction;
import com.example.wallet.entity.TransactionIssue;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.IssueStatus;
import com.example.wallet.exception.UnauthorizedTransactionAccessException;
import com.example.wallet.repository.TransactionIssueRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IssueServiceTest {

    @Mock
    private TransactionIssueRepository issueRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private IssueService issueService;

    private User user;
    private Wallet userWallet;
    private Wallet otherWallet;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("alice@wallet.local").fullName("Alice").build();
        userWallet = Wallet.builder().id(10L).user(user).build();
        otherWallet = Wallet.builder().id(20L).build();

        transaction = Transaction.builder()
                .id(100L)
                .referenceNumber("TXN-12345")
                .senderWallet(userWallet)
                .receiverWallet(otherWallet)
                .amount(new BigDecimal("200.00"))
                .build();
    }

    @Test
    @DisplayName("Should successfully create issue for customer's own transaction")
    void testCreateIssue_Success() {
        CreateIssueRequest request = CreateIssueRequest.builder()
                .transactionReference("TXN-12345")
                .title("Money deducted twice")
                .description("Please check ledger")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(transactionRepository.findByReferenceNumber("TXN-12345")).thenReturn(Optional.of(transaction));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(userWallet));

        TransactionIssue savedIssue = TransactionIssue.builder()
                .id(50L)
                .issueReference("ISSUE-2026-001")
                .transaction(transaction)
                .reportedBy(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(IssueStatus.OPEN)
                .build();

        when(issueRepository.save(any(TransactionIssue.class))).thenReturn(savedIssue);

        IssueResponse response = issueService.createIssue(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Money deducted twice");
        assertThat(response.getStatus()).isEqualTo(IssueStatus.OPEN);
        verify(issueRepository).save(any(TransactionIssue.class));
    }

    @Test
    @DisplayName("Should block user from reporting issue on an unrelated transaction")
    void testCreateIssue_Unauthorized() {
        Wallet unrelatedWallet1 = Wallet.builder().id(30L).build();
        Wallet unrelatedWallet2 = Wallet.builder().id(40L).build();
        Transaction unrelatedTxn = Transaction.builder()
                .id(200L)
                .referenceNumber("TXN-99999")
                .senderWallet(unrelatedWallet1)
                .receiverWallet(unrelatedWallet2)
                .build();

        CreateIssueRequest request = CreateIssueRequest.builder()
                .transactionReference("TXN-99999")
                .title("Unauthorized attempt")
                .description("Desc")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(transactionRepository.findByReferenceNumber("TXN-99999")).thenReturn(Optional.of(unrelatedTxn));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(userWallet));

        assertThatThrownBy(() -> issueService.createIssue(1L, request))
                .isInstanceOf(UnauthorizedTransactionAccessException.class);
    }

    @Test
    @DisplayName("Admin can update issue status and add resolution notes")
    void testUpdateIssueStatus_Admin() {
        User admin = User.builder().id(99L).email("admin@wallet.local").build();
        TransactionIssue issue = TransactionIssue.builder()
                .id(50L)
                .issueReference("ISSUE-001")
                .transaction(transaction)
                .reportedBy(user)
                .status(IssueStatus.OPEN)
                .build();

        UpdateIssueStatusRequest request = UpdateIssueStatusRequest.builder()
                .status(IssueStatus.RESOLVED)
                .resolutionNotes("Verified transaction status. Bank confirmation attached.")
                .build();

        when(userRepository.findById(99L)).thenReturn(Optional.of(admin));
        when(issueRepository.findById(50L)).thenReturn(Optional.of(issue));
        when(issueRepository.save(any(TransactionIssue.class))).thenAnswer(i -> i.getArgument(0));

        IssueResponse response = issueService.updateIssueStatus(99L, 50L, request);

        assertThat(response.getStatus()).isEqualTo(IssueStatus.RESOLVED);
        assertThat(response.getResolutionNotes()).contains("Bank confirmation attached");
    }
}
