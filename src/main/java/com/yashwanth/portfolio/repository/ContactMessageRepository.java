package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.ContactMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
    List<ContactMessage> findTop5ByDeletedFalseOrderByCreatedAtDesc();

    List<ContactMessage> findByDeletedFalseOrderByCreatedAtDesc();

    List<ContactMessage> findByDeletedTrueOrderByCreatedAtDesc();

    List<ContactMessage> findByArchivedTrueAndDeletedFalseOrderByCreatedAtDesc();

    long countByDeletedFalse();
}
