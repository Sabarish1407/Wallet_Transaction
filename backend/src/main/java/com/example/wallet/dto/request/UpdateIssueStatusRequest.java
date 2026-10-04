package com.example.wallet.dto.request;

import com.example.wallet.enums.IssueStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateIssueStatusRequest {

    @NotNull(message = "Status is required")
    private IssueStatus status;

    private String resolutionNotes;
}
