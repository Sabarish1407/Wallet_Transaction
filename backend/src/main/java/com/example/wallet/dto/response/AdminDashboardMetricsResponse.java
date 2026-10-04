package com.example.wallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardMetricsResponse {
    private long totalUsers;
    private long activeUsers;
    private long inactiveUsers;
    private long totalWallets;
    private long totalTransactions;
    private BigDecimal totalVolume;
    private BigDecimal totalCredit;
    private BigDecimal totalDebit;
    private long openIssues;
}
