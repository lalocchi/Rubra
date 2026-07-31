package com.rubra.backend.service;

import com.rubra.backend.dto.AuthResponse;
import com.rubra.backend.dto.LoginRequest;
import com.rubra.backend.dto.RegisterRequest;
import com.rubra.backend.entity.User;
import com.rubra.backend.repository.UserRepository;
import com.rubra.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("This email is already in use!");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) 
                .name(request.getName())
                .defaultCycleLength(request.getDefaultCycleLength() != null ? request.getDefaultCycleLength() : 28)
                .defaultPeriodDuration(request.getDefaultPeriodDuration() != null ? request.getDefaultPeriodDuration() : 5)
                .build();

        User savedUser = userRepository.save(user);
        String token = tokenProvider.generateToken(savedUser.getEmail(), savedUser.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .name(savedUser.getName())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) { 
            throw new RuntimeException("Password is incorrect!");
        }

        String token = tokenProvider.generateToken(user.getEmail(), user.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }
}