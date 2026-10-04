package com.example.wallet.dto.response;

import com.example.wallet.enums.WalletStatus;
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
public class WalletResponse {
    private Long id;
    private String walletNumber;
    private Long userId;
    private String userNumber;
    private String userEmail;
    private String userFullName;
    private BigDecimal balance;
    private String currency;
    private WalletStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
