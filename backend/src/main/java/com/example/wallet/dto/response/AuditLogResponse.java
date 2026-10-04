package com.example.wallet.dto.response;

import com.example.wallet.enums.ActivityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private ActivityType activityType;
    private String activityDescription;
    private String entityName;
    private String entityId;
    private String oldValue;
    private String newValue;
    private String status;
    private String ipAddress;
    private LocalDateTime createdAt;
}
