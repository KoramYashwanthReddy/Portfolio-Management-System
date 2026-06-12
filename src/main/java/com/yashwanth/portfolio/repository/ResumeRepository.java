package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.Resume;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    Optional<Resume> findTopByDeletedFalseOrderByCreatedAtDesc();
}
