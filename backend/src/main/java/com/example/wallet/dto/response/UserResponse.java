package com.example.wallet.dto.response;

import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
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
public class UserResponse {
    private Long id;
    private String userNumber;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private UserStatus status;
    private boolean passwordResetRequired;
    private String walletNumber;
    private BigDecimal walletBalance;
    private String temporaryPassword; // only returned upon creation for admin convenience
    private LocalDateTime createdAt;
}
