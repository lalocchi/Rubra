package com.rubra.backend.controller;

import com.rubra.backend.entity.User;
import com.rubra.backend.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("avatar", user.getAvatar() != null ? user.getAvatar() : "images/avatar_1.png");
        response.put("defaultCycleLength", user.getDefaultCycleLength());
        response.put("defaultPeriodDuration", user.getDefaultPeriodDuration());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileUpdateRequest request) {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(request.getName());
        user.setAvatar(request.getAvatar());
        if (request.getDefaultCycleLength() != null) {
            user.setDefaultCycleLength(request.getDefaultCycleLength());
        }
        if (request.getDefaultPeriodDuration() != null) {
            user.setDefaultPeriodDuration(request.getDefaultPeriodDuration());
        }

        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("avatar", savedUser.getAvatar() != null ? savedUser.getAvatar() : "images/avatar_1.png");
        response.put("defaultCycleLength", savedUser.getDefaultCycleLength());
        response.put("defaultPeriodDuration", savedUser.getDefaultPeriodDuration());

        return ResponseEntity.ok(response);
    }

    @Data
    public static class ProfileUpdateRequest {
        private String name;
        private String avatar;
        private Integer defaultCycleLength;
        private Integer defaultPeriodDuration;
    }
}
