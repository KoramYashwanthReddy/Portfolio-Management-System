package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.Skill;
import com.yashwanth.portfolio.entity.SkillCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, Long> {
    List<Skill> findByDeletedFalseOrderByDisplayOrderAscSkillNameAsc();

    List<Skill> findByCategoryAndDeletedFalseOrderByDisplayOrderAscSkillNameAsc(SkillCategory category);

    long countByDeletedFalse();
}
