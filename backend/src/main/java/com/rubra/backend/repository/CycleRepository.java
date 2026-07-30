package com.rubra.backend.repository;

import com.rubra.backend.entity.Cycle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CycleRepository extends JpaRepository<Cycle, Long> {
    List<Cycle> findByUserIdOrderByStartDateAsc(Long userId);
    List<Cycle> findByUserIdOrderByStartDateDesc(Long userId);
}