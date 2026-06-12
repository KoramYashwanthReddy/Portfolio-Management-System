package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "certifications")
public class Certification extends AuditableEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String issuer;

    @Column(nullable = false)
    private LocalDate issueDate;

    private LocalDate expiryDate;

    private String credentialId;

    private String credentialUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_file_id")
    private StoredFile certificateFile;
}
