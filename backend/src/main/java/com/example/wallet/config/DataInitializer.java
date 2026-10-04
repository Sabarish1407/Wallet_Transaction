package com.example.wallet.config;

import com.example.wallet.entity.User;
import com.example.wallet.entity.Wallet;
import com.example.wallet.enums.Role;
import com.example.wallet.enums.UserStatus;
import com.example.wallet.enums.WalletStatus;
import com.example.wallet.repository.UserRepository;
import com.example.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.treasury.wallet-number:WLT-TREASURY-0000}")
    private String treasuryWalletNumber;

    @Value("${app.treasury.initial-balance:10000000.00}")
    private BigDecimal treasuryInitialBalance;

    @Value("${app.security.default-admin.email:admin@wallet.local}")
    private String adminEmail;

    @Value("${app.security.default-admin.password:Admin@123}")
    private String adminPassword;

    @Value("${app.security.default-admin.name:System Administrator}")
    private String adminName;

    @Override
    @Transactional
    public void run(String... args) {
        initTreasury();
        initAdmin();
        initDemoUsers();
    }

    private void initTreasury() {
        if (walletRepository.findByWalletNumber(treasuryWalletNumber).isEmpty()) {
            User treasuryUser = userRepository.findByEmail("treasury@wallet.local").orElseGet(() ->
                    userRepository.save(User.builder()
                            .userNumber("1000000")
                            .email("treasury@wallet.local")
                            .fullName("System Treasury")
                            .passwordHash(passwordEncoder.encode("TreasurySystemSecret@999"))
                            .role(Role.ROLE_ADMIN)
                            .status(UserStatus.ACTIVE)
                            .passwordResetRequired(false)
                            .build())
            );

            Wallet treasuryWallet = Wallet.builder()
                    .walletNumber(treasuryWalletNumber)
                    .user(treasuryUser)
                    .balance(treasuryInitialBalance.setScale(2))
                    .currency("INR")
                    .status(WalletStatus.ACTIVE)
                    .build();
            walletRepository.save(treasuryWallet);
            log.info("Initialized System Treasury Wallet {} with balance ₹{}", treasuryWalletNumber, treasuryInitialBalance);
        }
    }

    private void initAdmin() {
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = User.builder()
                    .userNumber("1000001")
                    .email(adminEmail)
                    .fullName(adminName)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ROLE_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .passwordResetRequired(false)
                    .build();
            User savedAdmin = userRepository.save(admin);

            Wallet adminWallet = Wallet.builder()
                    .walletNumber("WLT-ADMIN-0001")
                    .user(savedAdmin)
                    .balance(BigDecimal.ZERO.setScale(2))
                    .currency("INR")
                    .status(WalletStatus.ACTIVE)
                    .build();
            walletRepository.save(adminWallet);
            log.info("Initialized Admin account: {} (User ID: 1000001)", adminEmail);
        }
    }

    private void initDemoUsers() {
        createDemoUserIfMissing("1000002", "alice@wallet.local", "Alice Sharma", "User@123", new BigDecimal("5000.00"), false);
        createDemoUserIfMissing("1000003", "bob@wallet.local", "Bob Verma", "User@123", new BigDecimal("3000.00"), false);
        createDemoUserIfMissing("1000004", "carol@wallet.local", "Carol Singh", "Temp@123", BigDecimal.ZERO, true);
    }

    private void createDemoUserIfMissing(String userNumber, String email, String fullName, String password, BigDecimal balance, boolean resetRequired) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = User.builder()
                    .userNumber(userNumber)
                    .email(email)
                    .fullName(fullName)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(Role.ROLE_CUSTOMER)
                    .status(UserStatus.ACTIVE)
                    .passwordResetRequired(resetRequired)
                    .build();
            User savedUser = userRepository.save(user);

            Wallet wallet = Wallet.builder()
                    .walletNumber("WLT-" + email.split("@")[0].toUpperCase() + "-1001")
                    .user(savedUser)
                    .balance(balance.setScale(2))
                    .currency("INR")
                    .status(WalletStatus.ACTIVE)
                    .build();
            walletRepository.save(wallet);
            log.info("Initialized Demo User: {} (ID: {}, balance: ₹{}, resetRequired: {})", email, userNumber, balance, resetRequired);
        }
    }
}
