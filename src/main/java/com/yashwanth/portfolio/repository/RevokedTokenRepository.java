package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.RevokedToken;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {
    boolean existsByTokenAndDeletedFalse(String token);

    void deleteByExpiresAtBefore(OffsetDateTime timestamp);
}
