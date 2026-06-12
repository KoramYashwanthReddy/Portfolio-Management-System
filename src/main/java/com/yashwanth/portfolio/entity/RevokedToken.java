package com.yashwanth.portfolio.entity;

import com.yashwanth.portfolio.auditing.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "revoked_tokens")
public class RevokedToken extends AuditableEntity {

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    @Column(nullable = false)
    private OffsetDateTime expiresAt;
}
