package com.example.wallet.controller;

import com.example.wallet.dto.request.CreateIssueRequest;
import com.example.wallet.dto.response.ApiResponse;
import com.example.wallet.dto.response.IssueResponse;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.service.IssueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/issues")
@RequiredArgsConstructor
@Tag(name = "Issues", description = "Endpoints for customer transaction dispute reporting and tracking")
public class IssueController {

    private final IssueService issueService;

    @PostMapping
    @Operation(summary = "Report an issue against a specific transaction")
    public ResponseEntity<ApiResponse<IssueResponse>> createIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateIssueRequest request) {
        IssueResponse response = issueService.createIssue(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Issue reported successfully", response));
    }

    @GetMapping
    @Operation(summary = "Get list of issues reported by the authenticated user")
    public ResponseEntity<ApiResponse<List<IssueResponse>>> getMyIssues(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<IssueResponse> issues = issueService.getUserIssues(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(issues));
    }

    @GetMapping("/{reference}")
    @Operation(summary = "Get issue details by issue reference")
    public ResponseEntity<ApiResponse<IssueResponse>> getIssue(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String reference) {
        IssueResponse response = issueService.getIssueByReference(reference, userDetails.getId(), false);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
