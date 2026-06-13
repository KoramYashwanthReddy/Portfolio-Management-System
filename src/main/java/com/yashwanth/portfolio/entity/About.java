package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "about")
public class About extends AuditableEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String designation;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String biography;

    @Column(nullable = false)
    private Integer experienceYears;

    @Column(nullable = false)
    private String currentLocation;

    @Column(nullable = false)
    private String email;

    private String phone;

    private String linkedinUrl;

    private String githubUrl;

    private String portfolioUrl;

    private String profileImageUrl;

    @Column(columnDefinition = "TEXT")
    private String headlineTicker;
}
