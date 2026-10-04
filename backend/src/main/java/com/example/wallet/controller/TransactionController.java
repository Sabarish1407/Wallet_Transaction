package com.example.wallet.controller;

import com.example.wallet.dto.response.ApiResponse;
import com.example.wallet.dto.response.TransactionResponse;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Endpoints for customer transaction history and detail inspection")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    @Operation(summary = "Get paginated transaction history for the authenticated user")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getMyTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<TransactionResponse> transactions = transactionService.getCustomerTransactions(
                userDetails.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    @GetMapping("/{reference}")
    @Operation(summary = "Get detailed information for a specific transaction including ledger entries")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransactionByReference(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String reference) {
        TransactionResponse response = transactionService.getTransactionByReference(reference, userDetails.getId(), false);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
