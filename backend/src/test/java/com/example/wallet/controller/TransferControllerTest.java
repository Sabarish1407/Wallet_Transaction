package com.example.wallet.controller;

import com.example.wallet.dto.request.TransferRequest;
import com.example.wallet.dto.response.TransferResponse;
import com.example.wallet.entity.User;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.TransactionStatus;
import com.example.wallet.exception.InsufficientBalanceException;
import com.example.wallet.security.CustomUserDetails;
import com.example.wallet.security.CustomUserDetailsService;
import com.example.wallet.security.JwtService;
import com.example.wallet.service.TransferService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransferController.class)
@AutoConfigureMockMvc(addFilters = false)
class TransferControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TransferService transferService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        User user = User.builder().id(1L).email("alice@wallet.local").role(Role.ROLE_CUSTOMER).build();
        CustomUserDetails userDetails = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("POST /api/v1/transfers with valid body returns 200")
    void testTransfer_Success() throws Exception {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("250.00"))
                .note("Gift")
                .build();

        TransferResponse response = TransferResponse.builder()
                .transactionReference("TXN-TRANSFER-100")
                .senderEmail("alice@wallet.local")
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("250.00"))
                .status(TransactionStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();

        when(transferService.transferMoney(eq(1L), any(TransferRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionReference").value("TXN-TRANSFER-100"));
    }

    @Test
    @DisplayName("POST /api/v1/transfers with insufficient balance returns 400")
    void testTransfer_InsufficientBalance() throws Exception {
        TransferRequest request = TransferRequest.builder()
                .receiverEmail("bob@wallet.local")
                .amount(new BigDecimal("99999.00"))
                .build();

        when(transferService.transferMoney(eq(1L), any(TransferRequest.class), any()))
                .thenThrow(new InsufficientBalanceException("Insufficient funds in wallet"));

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
    }
}
