package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.ProjectNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectNoteRepository extends JpaRepository<ProjectNote, Long> {
    List<ProjectNote> findByProjectIdAndDeletedFalse(Long projectId);

    List<ProjectNote> findByProjectIdAndDeletedFalseOrderByPinnedDescCreatedAtDesc(Long projectId);

    Optional<ProjectNote> findByIdAndProjectIdAndDeletedFalse(Long id, Long projectId);

    long countByProjectIdAndDeletedFalse(Long projectId);
}
