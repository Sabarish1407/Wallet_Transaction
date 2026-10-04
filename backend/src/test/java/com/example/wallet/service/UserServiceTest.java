package com.example.wallet.service;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.CreateUserRequest;
import com.example.wallet.dto.request.PasswordResetRequest;
import com.example.wallet.dto.response.UserResponse;
import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private WalletService walletService;
    @Mock
    private AuditService auditService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User admin;
    private User customer;
    private Wallet customerWallet;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(99L).email("admin@wallet.local").role(Role.ROLE_ADMIN).build();
        customer = User.builder()
                .id(1L)
                .email("david@wallet.local")
                .fullName("David Miller")
                .passwordHash("encoded_temp")
                .role(Role.ROLE_CUSTOMER)
                .status(UserStatus.ACTIVE)
                .passwordResetRequired(true)
                .build();

        customerWallet = Wallet.builder()
                .id(10L)
                .walletNumber("WLT-DAVID-1001")
                .user(customer)
                .balance(BigDecimal.ZERO)
                .status(WalletStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Admin can create user with auto-generated credentials and auto-wallet")
    void testCreateUser_Success() {
        CreateUserRequest request = CreateUserRequest.builder()
                .email("david@wallet.local")
                .fullName("David Miller")
                .phone("9876543210")
                .build();

        when(userRepository.existsByEmail("david@wallet.local")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded_temp");
        when(userRepository.save(any(User.class))).thenReturn(customer);
        when(walletService.createWalletForUser(any(User.class))).thenReturn(customerWallet);

        UserResponse response = userService.createUser(request);

        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("david@wallet.local");
        assertThat(response.isPasswordResetRequired()).isTrue();
        assertThat(response.getTemporaryPassword()).isNotNull();
        verify(walletService).createWalletForUser(any(User.class));
    }

    @Test
    @DisplayName("Admin can deactivate user and corresponding wallet")
    void testUpdateUserStatus_Deactivate() {
        when(userRepository.findById(99L)).thenReturn(Optional.of(admin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(customerWallet));

        UserResponse response = userService.updateUserStatus(99L, 1L, UserStatus.INACTIVE);

        assertThat(response.getStatus()).isEqualTo(UserStatus.INACTIVE);
        assertThat(customerWallet.getStatus()).isEqualTo(WalletStatus.INACTIVE);
    }

    @Test
    @DisplayName("User can reset password when current temporary password matches")
    void testResetPassword_Success() {
        PasswordResetRequest request = PasswordResetRequest.builder()
                .temporaryPassword("Temp@123")
                .newPassword("NewSecret@123")
                .build();

        when(userRepository.findByEmail("david@wallet.local")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("Temp@123", "encoded_temp")).thenReturn(true);
        when(passwordEncoder.encode("NewSecret@123")).thenReturn("new_hash");

        userService.resetPassword("david@wallet.local", request);

        assertThat(customer.getPasswordHash()).isEqualTo("new_hash");
        assertThat(customer.isPasswordResetRequired()).isFalse();
        verify(userRepository).save(customer);
    }

    @Test
    @DisplayName("Password reset fails when temporary password does not match")
    void testResetPassword_InvalidTempPassword() {
        PasswordResetRequest request = PasswordResetRequest.builder()
                .temporaryPassword("WrongTemp")
                .newPassword("NewSecret@123")
                .build();

        when(userRepository.findByEmail("david@wallet.local")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("WrongTemp", "encoded_temp")).thenReturn(false);

        assertThatThrownBy(() -> userService.resetPassword("david@wallet.local", request))
                .isInstanceOf(BadCredentialsException.class);
    }
}
