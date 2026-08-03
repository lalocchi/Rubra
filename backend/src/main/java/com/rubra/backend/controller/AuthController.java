package com.rubra.backend.controller;

import com.rubra.backend.dto.AuthResponse;
import com.rubra.backend.dto.GoogleConfigResponse;
import com.rubra.backend.dto.GoogleLoginRequest;
import com.rubra.backend.dto.LoginRequest;
import com.rubra.backend.dto.RegisterRequest;
import com.rubra.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${google.client.id}")
    private String googleClientId;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/google/client-id")
    public ResponseEntity<GoogleConfigResponse> getGoogleClientId() {
        return ResponseEntity.ok(GoogleConfigResponse.builder()
                .clientId(googleClientId)
                .build());
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request.getIdToken()));
    }
}