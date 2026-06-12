package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.PasswordResetToken;
import com.yashwanth.portfolio.entity.AdminUser;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenAndUsedFalseAndDeletedFalse(String token);

    List<PasswordResetToken> findByUserAndUsedFalseAndDeletedFalse(AdminUser user);

    void deleteByExpiresAtBefore(OffsetDateTime timestamp);
}
