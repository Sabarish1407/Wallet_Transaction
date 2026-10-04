package com.example.wallet.dto.response;

import com.example.wallet.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private Long userId;
    private String userNumber;
    private String email;
    private String fullName;
    private Role role;
    private boolean passwordResetRequired;
}
