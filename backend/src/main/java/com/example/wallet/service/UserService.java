package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.CreateUserRequest;
import com.example.wallet.dto.request.PasswordResetRequest;
import com.example.wallet.dto.response.UserResponse;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.ActivityType;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.exception.InvalidTransactionException;
import com.example.wallet.exception.UserNotFoundException;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom random = new SecureRandom();

    public String generateTemporaryPassword() {
        return "Temp@" + (100000 + random.nextInt(900000));
    }

    public String generateUserNumber() {
        while (true) {
            String num = String.valueOf(1000000 + random.nextInt(9000000));
            if (!userRepository.existsByUserNumber(num)) {
                return num;
            }
        }
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new InvalidTransactionException("User with email " + email + " already exists");
        }

        String rawPassword = (request.getInitialPassword() != null && !request.getInitialPassword().trim().isEmpty())
                ? request.getInitialPassword().trim()
                : generateTemporaryPassword();

        User user = User.builder()
                .userNumber(generateUserNumber())
                .email(email)
                .fullName(request.getFullName().trim())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(request.getRole() != null ? request.getRole() : Role.ROLE_CUSTOMER)
                .status(UserStatus.ACTIVE)
                .passwordResetRequired(true)
                .build();

        User savedUser = userRepository.save(user);

        // Auto-create wallet for customer
        Wallet wallet = walletService.createWalletForUser(savedUser);

        auditService.logActivity(
                savedUser.getId(),
                savedUser.getEmail(),
                ActivityType.USER_CREATED,
                "Created user " + savedUser.getEmail() + " with role " + savedUser.getRole(),
                "User",
                savedUser.getId().toString(),
                null,
                savedUser.getStatus().name(),
                "SUCCESS",
                null
        );

        UserResponse response = toResponse(savedUser, wallet);
        response.setTemporaryPassword(rawPassword);
        return response;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String query, Pageable pageable) {
        Page<User> users;
        if (query != null && !query.trim().isEmpty()) {
            users = userRepository.searchUsers(query.trim(), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        return users.map(u -> {
            Optional<Wallet> wallet = walletRepository.findByUserId(u.getId());
            return toResponse(u, wallet.orElse(null));
        });
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        Wallet wallet = walletRepository.findByUserId(userId).orElse(null);
        return toResponse(user, wallet);
    }

    @Transactional
    public UserResponse updateUserStatus(Long adminUserId, Long targetUserId, UserStatus status) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new UserNotFoundException("Admin not found"));

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + targetUserId));

        UserStatus oldStatus = target.getStatus();
        target.setStatus(status);
        User savedUser = userRepository.save(target);

        // Update corresponding wallet status
        Wallet wallet = walletRepository.findByUserId(targetUserId).orElse(null);
        if (wallet != null) {
            WalletStatus newWalletStatus = (status == UserStatus.ACTIVE) ? WalletStatus.ACTIVE : WalletStatus.INACTIVE;
            wallet.setStatus(newWalletStatus);
            walletRepository.save(wallet);

            auditService.logActivity(
                    adminUserId,
                    admin.getEmail(),
                    (status == UserStatus.ACTIVE) ? ActivityType.WALLET_ACTIVATED : ActivityType.WALLET_DEACTIVATED,
                    "Wallet " + wallet.getWalletNumber() + " status set to " + newWalletStatus,
                    "Wallet",
                    wallet.getId().toString(),
                    oldStatus.name(),
                    status.name(),
                    "SUCCESS",
                    null
            );
        }

        auditService.logActivity(
                adminUserId,
                admin.getEmail(),
                ActivityType.ADMIN_ACTION,
                "Updated user " + target.getEmail() + " status to " + status,
                "User",
                target.getId().toString(),
                oldStatus.name(),
                status.name(),
                "SUCCESS",
                null
        );

        return toResponse(savedUser, wallet);
    }

    @Transactional
    public UserResponse resetUserCredentials(Long adminUserId, Long targetUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new UserNotFoundException("Admin not found"));

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + targetUserId));

        String tempPassword = generateTemporaryPassword();
        target.setPasswordHash(passwordEncoder.encode(tempPassword));
        target.setPasswordResetRequired(true);
        User savedUser = userRepository.save(target);

        auditService.logActivity(
                adminUserId,
                admin.getEmail(),
                ActivityType.PASSWORD_RESET,
                "Admin generated temporary credentials for " + target.getEmail(),
                "User",
                target.getId().toString(),
                null,
                null,
                "SUCCESS",
                null
        );

        Wallet wallet = walletRepository.findByUserId(targetUserId).orElse(null);
        UserResponse response = toResponse(savedUser, wallet);
        response.setTemporaryPassword(tempPassword);
        return response;
    }

    @Transactional
    public void resetPassword(String email, PasswordResetRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));

        if (!passwordEncoder.matches(request.getTemporaryPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current/temporary password does not match");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetRequired(false);
        userRepository.save(user);

        auditService.logActivity(
                user.getId(),
                user.getEmail(),
                ActivityType.PASSWORD_RESET,
                "User completed password reset successfully",
                "User",
                user.getId().toString(),
                "PASSWORD_RESET_REQUIRED=true",
                "PASSWORD_RESET_REQUIRED=false",
                "SUCCESS",
                null
        );
    }

    public UserResponse toResponse(User user, Wallet wallet) {
        return UserResponse.builder()
                .id(user.getId())
                .userNumber(user.getUserNumber())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .status(user.getStatus())
                .passwordResetRequired(user.isPasswordResetRequired())
                .walletNumber(wallet != null ? wallet.getWalletNumber() : null)
                .walletBalance(wallet != null ? wallet.getBalance() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
