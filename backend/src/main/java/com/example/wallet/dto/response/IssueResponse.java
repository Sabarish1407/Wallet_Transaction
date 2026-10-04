package com.example.wallet.dto.response;

import com.example.wallet.enums.IssueStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueResponse {
    private Long id;
    private String issueReference;
    private String transactionReference;
    private BigDecimal transactionAmount;
    private String reportedByEmail;
    private String reportedByName;
    private String title;
    private String description;
    private IssueStatus status;
    private String resolutionNotes;
    private String resolvedByEmail;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
