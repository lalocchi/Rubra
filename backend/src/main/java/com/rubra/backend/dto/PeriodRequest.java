package com.rubra.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class PeriodRequest {
    private Long userId;
    private LocalDate startDate;
    private LocalDate endDate; //  (Optional)
}