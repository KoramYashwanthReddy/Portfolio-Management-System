package com.yashwanth.portfolio.security.service;

import com.yashwanth.portfolio.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import java.time.OffsetDateTime;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PortfolioUserDetailsService implements UserDetailsService {

    private final AdminUserRepository adminUserRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return adminUserRepository.findByEmailOrMobileNumberAndDeletedFalse(username, username)
                .map(user -> User.withUsername(user.getEmail())
                        .password(user.getPassword())
                        .authorities(java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                        .accountLocked(isAccountLocked(user))
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Admin account not found"));
    }

    private boolean isAccountLocked(com.yashwanth.portfolio.entity.AdminUser user) {
        return user.getAccountLockedUntil() != null && user.getAccountLockedUntil().isAfter(OffsetDateTime.now());
    }
}
