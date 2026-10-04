package com.example.wallet.audit;

import com.example.wallet.dto.response.AuditLogResponse;
import com.example.wallet.entity.AuditLog;
import com.example.wallet.enums.ActivityType;
import com.example.wallet.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logActivity(Long userId,
                            String userEmail,
                            ActivityType activityType,
                            String description,
                            String entityName,
                            String entityId,
                            String oldValue,
                            String newValue,
                            String status,
                            String ipAddress) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .userEmail(userEmail)
                    .activityType(activityType)
                    .activityDescription(description)
                    .entityName(entityName)
                    .entityId(entityId)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .status(status != null ? status : "SUCCESS")
                    .ipAddress(ipAddress != null ? ipAddress : "0:0:0:0:0:0:0:1")
                    .build();
            auditLogRepository.save(auditLog);
            log.info("Audit recorded: [{}] user={} action={}", activityType, userEmail, description);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(ActivityType activityType, String query, Pageable pageable) {
        Page<AuditLog> page = auditLogRepository.searchAuditLogs(activityType, query, pageable);
        return page.map(this::toResponse);
    }

    public AuditLogResponse toResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId())
                .userId(a.getUserId())
                .userEmail(a.getUserEmail())
                .activityType(a.getActivityType())
                .activityDescription(a.getActivityDescription())
                .entityName(a.getEntityName())
                .entityId(a.getEntityId())
                .oldValue(a.getOldValue())
                .newValue(a.getNewValue())
                .status(a.getStatus())
                .ipAddress(a.getIpAddress())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
