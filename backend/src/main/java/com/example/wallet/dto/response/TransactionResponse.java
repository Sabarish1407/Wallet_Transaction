package com.example.wallet.dto.response;

import com.example.wallet.enums.TransactionStatus;
import com.example.wallet.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
    private Long id;
    private String referenceNumber;
    private String senderEmail;
    private String senderName;
    private String senderWalletNumber;
    private String receiverEmail;
    private String receiverName;
    private String receiverWalletNumber;
    private TransactionType type;
    private BigDecimal amount;
    private TransactionStatus status;
    private String note;
    private String failureReason;
    private String userRoleInTxn; // "DEBIT" if user was sender, "CREDIT" if user was receiver
    private LocalDateTime createdAt;
    private List<LedgerEntryResponse> ledgerEntries;
}
