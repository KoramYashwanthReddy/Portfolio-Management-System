package com.yashwanth.portfolio.startup;

import com.yashwanth.portfolio.config.AdminProperties;
import com.yashwanth.portfolio.entity.AdminUser;
import com.yashwanth.portfolio.entity.Role;
import com.yashwanth.portfolio.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminDataInitializer implements ApplicationRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminProperties adminProperties;

    @Override
    public void run(ApplicationArguments args) {
        adminUserRepository.findByEmailAndDeletedFalse(adminProperties.email()).orElseGet(() -> {
            AdminUser user = new AdminUser();
            user.setName(adminProperties.name());
            user.setEmail(adminProperties.email());
            user.setMobileNumber(adminProperties.mobileNumber());
            user.setPassword(passwordEncoder.encode(adminProperties.password()));
            user.setRole(Role.ADMIN);
            return adminUserRepository.save(user);
        });
    }
}
