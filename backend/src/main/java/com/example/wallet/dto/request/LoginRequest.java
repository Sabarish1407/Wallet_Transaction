package com.example.wallet.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email or 7-digit User ID is required")
    private String email; // Accepts email address OR 7-digit User ID

    @NotBlank(message = "Password is required")
    private String password;

    public String getIdentifier() {
        return email != null ? email.trim() : null;
    }
}
