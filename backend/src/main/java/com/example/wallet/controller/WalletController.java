package com.example.wallet.controller;

import com.example.wallet.dto.request.TopUpRequest;
import com.example.wallet.dto.response.ApiResponse;
import com.example.wallet.dto.response.WalletResponse;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
@Tag(name = "Wallet", description = "Endpoints for viewing wallet balance, details, and adding money (top-up)")
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    @Operation(summary = "Get authenticated user's wallet")
    public ResponseEntity<ApiResponse<WalletResponse>> getMyWallet(@AuthenticationPrincipal CustomUserDetails userDetails) {
        WalletResponse response = walletService.getWalletByUserId(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/top-up")
    @Operation(summary = "Add funds to wallet with double-entry clearing against system treasury")
    public ResponseEntity<ApiResponse<WalletResponse>> topUp(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TopUpRequest request) {
        WalletResponse response = walletService.topUpWallet(userDetails.getId(), request, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.success("Money added successfully", response));
    }
}
