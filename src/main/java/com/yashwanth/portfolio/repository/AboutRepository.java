package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.About;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AboutRepository extends JpaRepository<About, Long> {
    Optional<About> findTopByDeletedFalseOrderByUpdatedAtDesc();
}
