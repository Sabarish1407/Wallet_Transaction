package com.example.wallet.dto.response;

import com.example.wallet.enums.TransactionStatus;
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
public class TransferResponse {
    private String transactionReference;
    private String senderWalletNumber;
    private String senderUserNumber;
    private String senderEmail;
    private String receiverWalletNumber;
    private String receiverUserNumber;
    private String receiverEmail;
    private BigDecimal amount;
    private TransactionStatus status;
    private String note;
    private LocalDateTime createdAt;
}
