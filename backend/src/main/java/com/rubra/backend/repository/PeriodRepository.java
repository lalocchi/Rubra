package com.rubra.backend.repository;

import com.rubra.backend.entity.Period;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PeriodRepository extends JpaRepository<Period, Long> {
    List<Period> findByUserIdOrderByStartDateAsc(Long userId);
    List<Period> findByUserIdOrderByStartDateDesc(Long userId);
}
