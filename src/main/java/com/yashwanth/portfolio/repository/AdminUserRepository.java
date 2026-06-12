package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.AdminUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByEmailAndDeletedFalse(String email);
    Optional<AdminUser> findByEmailOrMobileNumberAndDeletedFalse(String email, String mobileNumber);

    boolean existsByEmail(String email);
}
