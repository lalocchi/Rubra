package com.rubra.backend.service;

import com.rubra.backend.dto.AuthResponse;
import com.rubra.backend.dto.LoginRequest;
import com.rubra.backend.dto.RegisterRequest;
import com.rubra.backend.entity.User;
import com.rubra.backend.repository.UserRepository;
import com.rubra.backend.security.GoogleTokenVerifierService;
import com.rubra.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final GoogleTokenVerifierService googleTokenVerifier;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("This email is already in use!");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) 
                .name(request.getName())
                .avatar("images/avatar_1.png")
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

    public AuthResponse googleLogin(String idToken) {
        try {
            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = googleTokenVerifier.verify(idToken);
            if (payload == null) {
                throw new RuntimeException("Google ID Token validation failed!");
            }

            String email = payload.getEmail();
            String name = (String) payload.get("name");

            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                // Auto-register new Google user
                user = User.builder()
                        .email(email)
                        .name(name != null ? name : "Google User")
                        .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .avatar("images/avatar_1.png") // default avatar
                        .defaultCycleLength(28)
                        .defaultPeriodDuration(5)
                        .build();
                user = userRepository.save(user);
            }

            String token = tokenProvider.generateToken(user.getEmail(), user.getId());

            return AuthResponse.builder()
                    .token(token)
                    .userId(user.getId())
                    .email(user.getEmail())
                    .name(user.getName())
                    .build();

        } catch (Exception ex) {
            throw new RuntimeException("Google authentication failed: " + ex.getMessage(), ex);
        }
    }
}