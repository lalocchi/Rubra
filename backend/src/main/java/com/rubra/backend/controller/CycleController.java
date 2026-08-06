package com.rubra.backend.controller;

import com.rubra.backend.dto.PeriodRequest;
import com.rubra.backend.dto.PredictionResponse;
import com.rubra.backend.entity.Period;
import com.rubra.backend.entity.User;
import com.rubra.backend.repository.PeriodRepository;
import com.rubra.backend.repository.UserRepository;
import com.rubra.backend.service.CycleCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cycles")
@RequiredArgsConstructor
public class CycleController {

    private final CycleCalculationService cycleCalculationService;
    private final UserRepository userRepository;
    private final PeriodRepository periodRepository;

    @PostMapping("/period")
    public ResponseEntity<PredictionResponse> addPeriod(@RequestBody PeriodRequest request) {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PredictionResponse response = cycleCalculationService.processNewPeriod(
                user.getId(),
                request.getStartDate(),
                request.getEndDate()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/periods")
    public ResponseEntity<?> getPeriods() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Period> periods = periodRepository.findByUserIdOrderByStartDateAsc(user.getId());
        
        List<Map<String, Object>> response = new ArrayList<>();
        for (Period p : periods) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("startDate", p.getStartDate().toString());
            map.put("endDate", p.getEndDate() != null ? p.getEndDate().toString() : null);
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/predictions")
    public ResponseEntity<PredictionResponse> getPredictions() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PredictionResponse response = cycleCalculationService.calculatePredictions(user);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/period/{id}")
    public ResponseEntity<?> deletePeriod(@PathVariable Long id) {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        cycleCalculationService.deletePeriodAndRecalculate(user.getId(), id);
        return ResponseEntity.ok().build();
    }
}