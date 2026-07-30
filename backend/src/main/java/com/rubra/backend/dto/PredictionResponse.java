package com.rubra.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {

    private LocalDate predictedNextPeriod;
    private LocalDate estimatedOvulation;
    private LocalDate fertileWindowStart;
    private LocalDate fertileWindowEnd;
    
    // Fazalar
    private LocalDate follicularPhaseStart;
    private LocalDate follicularPhaseEnd;
    private LocalDate lutealPhaseStart;
    private LocalDate lutealPhaseEnd;

    // Statistik göstəricilər
    private Double averageCycleLength;
    private Double cycleVariability;
    private String confidenceScore; // HIGH, MEDIUM, LOW
    private String confidenceMessage;
}