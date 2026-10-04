package com.example.wallet.security;

import com.example.wallet.audit.AuditService;
import com.example.wallet.dto.request.LoginRequest;
import com.example.wallet.dto.request.PasswordResetRequest;
import com.example.wallet.dto.response.LoginResponse;
import com.example.wallet.entity.User;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthenticationService authenticationService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .userNumber("1000002")
                .email("alice@wallet.local")
                .fullName("Alice Sharma")
                .passwordHash("hashed_password")
                .role(Role.ROLE_CUSTOMER)
                .status(UserStatus.ACTIVE)
                .passwordResetRequired(false)
                .build();
    }

    @Test
    @DisplayName("Should successfully authenticate using email and return token")
    void testLogin_Success() {
        LoginRequest request = LoginRequest.builder()
                .email("alice@wallet.local")
                .password("User@123")
                .build();

        when(userRepository.findByEmailOrUserNumber("alice@wallet.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("User@123", "hashed_password")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt.mock.token");

        LoginResponse response = authenticationService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt.mock.token");
        assertThat(response.getUserNumber()).isEqualTo("1000002");
        assertThat(response.getEmail()).isEqualTo("alice@wallet.local");
        assertThat(response.isPasswordResetRequired()).isFalse();
    }

    @Test
    @DisplayName("Should successfully authenticate using 7-digit User ID and return token")
    void testLogin_Using7DigitUserId_Success() {
        LoginRequest request = LoginRequest.builder()
                .email("1000002")
                .password("User@123")
                .build();

        when(userRepository.findByEmailOrUserNumber("1000002")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("User@123", "hashed_password")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt.mock.token");

        LoginResponse response = authenticationService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt.mock.token");
        assertThat(response.getUserNumber()).isEqualTo("1000002");
        assertThat(response.getEmail()).isEqualTo("alice@wallet.local");
        assertThat(response.isPasswordResetRequired()).isFalse();
    }

    @Test
    @DisplayName("Should fail when password does not match")
    void testLogin_InvalidPassword() {
        LoginRequest request = LoginRequest.builder()
                .email("alice@wallet.local")
                .password("WrongPassword")
                .build();

        when(userRepository.findByEmailOrUserNumber("alice@wallet.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> authenticationService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email/User ID or password");
    }

    @Test
    @DisplayName("Should reset first-login password and return active token")
    void testResetFirstLoginPassword() {
        PasswordResetRequest request = PasswordResetRequest.builder()
                .temporaryPassword("Temp@123")
                .newPassword("NewSecret@123")
                .build();

        when(userRepository.findByEmailOrUserNumber("alice@wallet.local")).thenReturn(Optional.of(user));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("new.jwt.token");

        LoginResponse response = authenticationService.resetFirstLoginPassword("alice@wallet.local", request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("new.jwt.token");
        assertThat(response.getUserNumber()).isEqualTo("1000002");
        assertThat(response.isPasswordResetRequired()).isFalse();
        verify(userService).resetPassword("alice@wallet.local", request);
    }
}
