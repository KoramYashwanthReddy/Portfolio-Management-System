package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.Certification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CertificationRepository extends JpaRepository<Certification, Long> {
    List<Certification> findByDeletedFalseOrderByIssueDateDesc();

    long countByDeletedFalse();
}
