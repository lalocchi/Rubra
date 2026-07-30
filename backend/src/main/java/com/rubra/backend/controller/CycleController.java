package com.rubra.backend.controller;

import com.rubra.backend.dto.PeriodRequest;
import com.rubra.backend.dto.PredictionResponse;
import com.rubra.backend.service.CycleCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cycles")
@RequiredArgsConstructor
public class CycleController {

    private final CycleCalculationService cycleCalculationService;

    @PostMapping("/period")
    public ResponseEntity<PredictionResponse> addPeriod(@RequestBody PeriodRequest request) {
        PredictionResponse response = cycleCalculationService.processNewPeriod(
                request.getUserId(),
                request.getStartDate(),
                request.getEndDate()
        );
        return ResponseEntity.ok(response);
    }
}