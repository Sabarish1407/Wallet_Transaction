package com.example.wallet.security;

import com.example.wallet.entity.User;
import com.example.wallet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByEmailOrUserNumber(identifier != null ? identifier.trim() : "")
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email or User ID: " + identifier));
        return new CustomUserDetails(user);
    }
}
