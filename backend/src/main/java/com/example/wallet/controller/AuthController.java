package com.example.wallet.controller;

import com.example.wallet.dto.request.LoginRequest;
import com.example.wallet.dto.request.PasswordResetRequest;
import com.example.wallet.dto.response.ApiResponse;
import com.example.wallet.dto.response.LoginResponse;
import com.example.wallet.dto.response.UserResponse;
import com.example.wallet.security.AuthenticationService;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for login, credential verification, and password resets")
public class AuthController {

    private final AuthenticationService authenticationService;
    private final UserService userService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authenticationService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "First-time login or admin-mandated password reset")
    public ResponseEntity<ApiResponse<LoginResponse>> resetPassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PasswordResetRequest request) {
        LoginResponse response = authenticationService.resetFirstLoginPassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Password reset completed successfully", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated user details")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserResponse response = userService.getUserById(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
