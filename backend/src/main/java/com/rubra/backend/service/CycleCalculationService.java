package com.rubra.backend.service;

import com.rubra.backend.dto.PredictionResponse;
import com.rubra.backend.entity.Cycle;
import com.rubra.backend.entity.Period;
import com.rubra.backend.entity.User;
import com.rubra.backend.repository.CycleRepository;
import com.rubra.backend.repository.PeriodRepository;
import com.rubra.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CycleCalculationService {

    private final PeriodRepository periodRepository;
    private final CycleRepository cycleRepository;
    private final UserRepository userRepository;

    private static final int DEFAULT_LUTEAL_PHASE = 14;
    private static final int DEFAULT_CYCLE_LENGTH = 28;

    @Transactional
    public PredictionResponse processNewPeriod(Long userId, LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("İstifadəçi tapılmadı"));

        // 1. Yeni Period saxla
        Period newPeriod = Period.builder()
                .user(user)
                .startDate(startDate)
                .endDate(endDate)
                .isEndDateConfirmed(endDate != null)
                .duration(endDate != null ? (int) ChronoUnit.DAYS.between(startDate, endDate) + 1 : user.getDefaultPeriodDuration())
                .build();
        periodRepository.save(newPeriod);

        // 2. Keçmiş Period-lara baxıb Cycle-ları yenidən hesabla
        recalculateCycles(user);

        // 3. Proqnozları formalaşdır
        return calculatePredictions(user);
    }

    private void recalculateCycles(User user) {
        List<Period> periods = periodRepository.findByUserIdOrderByStartDateAsc(user.getId());
        if (periods.size() < 2) return;

        List<Cycle> existingCycles = cycleRepository.findByUserIdOrderByStartDateAsc(user.getId());
        cycleRepository.deleteAll(existingCycles);

        List<Integer> cycleLengths = new ArrayList<>();
        for (int i = 1; i < periods.size(); i++) {
            LocalDate prevStart = periods.get(i - 1).getStartDate();
            LocalDate currStart = periods.get(i).getStartDate();

            int length = (int) ChronoUnit.DAYS.between(prevStart, currStart);
            cycleLengths.add(length);

            Cycle cycle = Cycle.builder()
                    .user(user)
                    .startDate(prevStart)
                    .endDate(currStart.minusDays(1))
                    .length(length)
                    .build();
            cycleRepository.save(cycle);
        }

        if (!cycleLengths.isEmpty()) {
            double avg = cycleLengths.stream().mapToInt(Integer::intValue).average().orElse(DEFAULT_CYCLE_LENGTH);
            user.setAverageCycleLength(avg);

            double variance = cycleLengths.stream()
                    .mapToDouble(l -> Math.pow(l - avg, 2))
                    .average().orElse(0.0);
            user.setCycleVariability(Math.sqrt(variance));

            userRepository.save(user);
        }
    }

    public PredictionResponse calculatePredictions(User user) {
        List<Period> periods = periodRepository.findByUserIdOrderByStartDateDesc(user.getId());

        LocalDate lastPeriodStart = periods.isEmpty() ? LocalDate.now() : periods.get(0).getStartDate();
        double avgCycle = user.getAverageCycleLength() != null ? user.getAverageCycleLength() : user.getDefaultCycleLength();
        int roundedAvgCycle = (int) Math.round(avgCycle);

        LocalDate predictedNextPeriod = lastPeriodStart.plusDays(roundedAvgCycle);
        LocalDate estimatedOvulation = predictedNextPeriod.minusDays(DEFAULT_LUTEAL_PHASE);

        LocalDate fertileStart = estimatedOvulation.minusDays(5);
        LocalDate fertileEnd = estimatedOvulation.plusDays(1);

        LocalDate follicularStart = lastPeriodStart;
        LocalDate follicularEnd = estimatedOvulation;
        LocalDate lutealStart = estimatedOvulation;
        LocalDate lutealEnd = predictedNextPeriod.minusDays(1);

        List<Cycle> cycles = cycleRepository.findByUserIdOrderByStartDateAsc(user.getId());
        double variability = user.getCycleVariability() != null ? user.getCycleVariability() : 0.0;

        String score;
        String message;

        if (cycles.size() >= 6 && variability < 3.0) {
            score = "HIGH";
            message = "Yüksək dəqiqlikli proqnoz";
        } else if (cycles.size() >= 3 && variability <= 7.0) {
            score = "MEDIUM";
            message = "Orta dəqiqlikli proqnoz";
        } else {
            score = "LOW";
            message = "Təxmini proqnoz (Kifayət qədər məlumat yoxdur)";
        }

        return PredictionResponse.builder()
                .predictedNextPeriod(predictedNextPeriod)
                .estimatedOvulation(estimatedOvulation)
                .fertileWindowStart(fertileStart)
                .fertileWindowEnd(fertileEnd)
                .follicularPhaseStart(follicularStart)
                .follicularPhaseEnd(follicularEnd)
                .lutealPhaseStart(lutealStart)
                .lutealPhaseEnd(lutealEnd)
                .averageCycleLength(avgCycle)
                .cycleVariability(variability)
                .confidenceScore(score)
                .confidenceMessage(message)
                .build();
    }
}