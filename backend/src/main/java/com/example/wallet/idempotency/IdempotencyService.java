package com.example.wallet.idempotency;

import com.example.wallet.entity.IdempotencyRecord;
import com.example.wallet.exception.IdempotencyConflictException;
import com.example.wallet.repository.IdempotencyRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRepository;
    private final ObjectMapper objectMapper;

    /**
     * Checks if idempotency key has already been processed or is running.
     * Returns cached response object if already COMPLETED.
     * Throws IdempotencyConflictException if IN_PROGRESS.
     */
    @Transactional
    public <T> Optional<T> checkAndRegister(String key, String requestHash, Class<T> responseClass) {
        if (key == null || key.trim().isEmpty()) {
            return Optional.empty();
        }

        Optional<IdempotencyRecord> existing = idempotencyRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();
            if ("COMPLETED".equals(record.getStatus())) {
                log.info("Returning cached response for idempotency key: {}", key);
                try {
                    return Optional.of(objectMapper.readValue(record.getResponseBody(), responseClass));
                } catch (Exception e) {
                    log.error("Failed to parse cached response for key {}: {}", key, e.getMessage());
                    return Optional.empty();
                }
            } else if ("IN_PROGRESS".equals(record.getStatus())) {
                throw new IdempotencyConflictException("A request with idempotency key '" + key + "' is currently being processed.");
            }
        }

        // Register new key as IN_PROGRESS
        IdempotencyRecord newRecord = IdempotencyRecord.builder()
                .idempotencyKey(key)
                .requestHash(requestHash)
                .status("IN_PROGRESS")
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        idempotencyRepository.save(newRecord);
        return Optional.empty();
    }

    @Transactional
    public void markCompleted(String key, Object responseObject, int statusCode) {
        if (key == null || key.trim().isEmpty()) {
            return;
        }

        idempotencyRepository.findByIdempotencyKey(key).ifPresent(record -> {
            try {
                record.setStatus("COMPLETED");
                record.setStatusCode(statusCode);
                record.setResponseBody(objectMapper.writeValueAsString(responseObject));
                idempotencyRepository.save(record);
            } catch (Exception e) {
                log.error("Failed to cache response body for key {}: {}", key, e.getMessage());
            }
        });
    }

    @Transactional
    public void markFailed(String key) {
        if (key == null || key.trim().isEmpty()) {
            return;
        }
        idempotencyRepository.findByIdempotencyKey(key).ifPresent(record -> {
            record.setStatus("FAILED");
            idempotencyRepository.save(record);
        });
    }
}
