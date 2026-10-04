package com.example.wallet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequest {

    @NotBlank(message = "Recipient Email or 7-digit User ID is required")
    private String receiverEmail; // Accepts recipient email OR 7-digit User ID

    @NotNull(message = "Transfer amount is required")
    @DecimalMin(value = "1.00", message = "Minimum transfer amount is 1.00")
    private BigDecimal amount;

    private String note;

    public String getReceiverIdentifier() {
        return receiverEmail != null ? receiverEmail.trim() : null;
    }
}
