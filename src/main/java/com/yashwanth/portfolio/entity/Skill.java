package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "skills")
public class Skill extends AuditableEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String skillName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SkillCategory category;

    @Column(nullable = false)
    private Integer proficiencyPercentage;

    @Column(nullable = false)
    private Integer displayOrder;
}
