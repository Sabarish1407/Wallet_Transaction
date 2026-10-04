package com.example.wallet.security;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.LoginRequest;
import com.example.wallet.dto.request.PasswordResetRequest;
import com.example.wallet.dto.response.LoginResponse;
import com.example.wallet.entity.User;
import com.example.wallet.enums.ActivityType;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.exception.UserNotFoundException;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String identifier = request.getIdentifier();
        User user = userRepository.findByEmailOrUserNumber(identifier).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditService.logActivity(
                    user != null ? user.getId() : null,
                    user != null ? user.getEmail() : identifier,
                    ActivityType.LOGIN_FAILED,
                    "Failed login attempt for " + identifier,
                    "User",
                    null,
                    null,
                    null,
                    "FAILED",
                    null
            );
            throw new BadCredentialsException("Invalid email/User ID or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BadCredentialsException("Account is inactive. Please contact administrator.");
        }

        String token = jwtService.generateToken(user);

        auditService.logActivity(
                user.getId(),
                user.getEmail(),
                ActivityType.USER_LOGIN,
                "User logged in successfully via " + identifier,
                "User",
                user.getId().toString(),
                null,
                null,
                "SUCCESS",
                null
        );

        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .userNumber(user.getUserNumber())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .passwordResetRequired(user.isPasswordResetRequired())
                .build();
    }

    @Transactional
    public LoginResponse resetFirstLoginPassword(String identifier, PasswordResetRequest request) {
        User user = userRepository.findByEmailOrUserNumber(identifier)
                .orElseThrow(() -> new UserNotFoundException("User not found with identifier: " + identifier));

        userService.resetPassword(user.getEmail(), request);

        // Reload user after password reset
        User updatedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        String newToken = jwtService.generateToken(updatedUser);

        return LoginResponse.builder()
                .token(newToken)
                .type("Bearer")
                .userId(updatedUser.getId())
                .userNumber(updatedUser.getUserNumber())
                .email(updatedUser.getEmail())
                .fullName(updatedUser.getFullName())
                .role(updatedUser.getRole())
                .passwordResetRequired(false)
                .build();
    }
}
