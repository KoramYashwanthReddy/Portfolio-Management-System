package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "projects")
public class Project extends AuditableEntity {

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 250)
    private String shortDescription;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String detailedDescription;

    @Column(nullable = false, length = 500)
    private String technologies;

    private String githubUrl;

    private String liveUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProjectCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProjectStatus status;

    @Column(nullable = false)
    private boolean featured;

    private Boolean displayed = Boolean.TRUE;

    private LocalDate completionDate;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "project_image_files",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "file_id")
    )
    private List<StoredFile> imageFiles = new ArrayList<>();

    @OneToMany(mappedBy = "project", fetch = FetchType.LAZY, cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProjectVideo> videoFiles = new ArrayList<>();
}
