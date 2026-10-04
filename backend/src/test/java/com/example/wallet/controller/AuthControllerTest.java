package com.example.wallet.controller;

import com.example.wallet.dto.request.LoginRequest;
import com.example.wallet.dto.response.LoginResponse;
import com.example.wallet.enums.Role;
import com.example.wallet.security.AuthenticationService;
import com.example.wallet.security.CustomUserDetailsService;
import com.example.wallet.security.JwtService;
import com.example.wallet.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthenticationService authenticationService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/v1/auth/login with valid credentials returns 200")
    void testLogin_Success() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("alice@wallet.local")
                .password("User@123")
                .build();

        LoginResponse response = LoginResponse.builder()
                .token("jwt.token.abc")
                .type("Bearer")
                .userId(1L)
                .email("alice@wallet.local")
                .fullName("Alice")
                .role(Role.ROLE_CUSTOMER)
                .passwordResetRequired(false)
                .build();

        when(authenticationService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("jwt.token.abc"))
                .andExpect(jsonPath("$.data.email").value("alice@wallet.local"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with bad credentials returns 401")
    void testLogin_BadCredentials() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("alice@wallet.local")
                .password("WrongPassword")
                .build();

        when(authenticationService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with invalid email format returns 400 validation error")
    void testLogin_ValidationError() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("not-an-email")
                .password("")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }
}
