package com.example.wallet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private boolean success;
    private String error;
    private String message;
    private int status;
    private String path;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private List<String> details;
}
