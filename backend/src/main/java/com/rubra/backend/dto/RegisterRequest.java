package com.rubra.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String name;
    private Integer defaultCycleLength; // Opsional (Default: 28)
    private Integer defaultPeriodDuration; // Opsional (Default: 5)
}
