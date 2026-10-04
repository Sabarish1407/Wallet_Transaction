package com.example.wallet.controller;

import com.example.wallet.dto.request.TransferRequest;
import com.example.wallet.dto.response.ApiResponse;
import com.example.wallet.dto.response.TransferResponse;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.service.TransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
@Tag(name = "Transfers", description = "Endpoints for user-to-user atomic money transfers")
public class TransferController {

    private final TransferService transferService;

    @PostMapping
    @Operation(summary = "Transfer money from authenticated user's wallet to another registered user")
    public ResponseEntity<ApiResponse<TransferResponse>> transfer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TransferRequest request) {
        TransferResponse response = transferService.transferMoney(userDetails.getId(), request, idempotencyKey);
        return ResponseEntity.ok(ApiResponse.success("Transfer completed successfully", response));
    }
}
