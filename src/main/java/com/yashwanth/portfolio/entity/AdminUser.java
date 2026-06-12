package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "admin_users")
public class AdminUser extends AuditableEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(unique = true, length = 20)
    private String mobileNumber;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private int failedLoginAttempts = 0;

    private OffsetDateTime accountLockedUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.ADMIN;
}
