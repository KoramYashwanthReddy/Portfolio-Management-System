package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    List<Project> findTop5ByDeletedFalseOrderByCreatedAtDesc();

    long countByFeaturedTrueAndDeletedFalse();

    long countByDeletedFalse();
}
