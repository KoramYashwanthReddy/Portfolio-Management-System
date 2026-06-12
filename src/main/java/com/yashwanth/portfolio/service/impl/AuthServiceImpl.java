package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.config.AdminProperties;
import com.yashwanth.portfolio.config.SecurityProperties;
import com.yashwanth.portfolio.dto.request.ChangePasswordRequest;
import com.yashwanth.portfolio.dto.request.ForgotPasswordRequest;
import com.yashwanth.portfolio.dto.request.LoginRequest;
import com.yashwanth.portfolio.dto.request.RefreshTokenRequest;
import com.yashwanth.portfolio.dto.request.ResetPasswordRequest;
import com.yashwanth.portfolio.dto.response.AdminProfileResponse;
import com.yashwanth.portfolio.dto.response.AuthResponse;
import com.yashwanth.portfolio.entity.AdminUser;
import com.yashwanth.portfolio.entity.PasswordResetToken;
import com.yashwanth.portfolio.entity.RevokedToken;
import com.yashwanth.portfolio.exception.BadRequestException;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.exception.UnauthorizedException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.mail.MailService;
import com.yashwanth.portfolio.repository.AdminUserRepository;
import com.yashwanth.portfolio.repository.PasswordResetTokenRepository;
import com.yashwanth.portfolio.repository.RevokedTokenRepository;
import com.yashwanth.portfolio.security.jwt.JwtService;
import com.yashwanth.portfolio.security.service.PortfolioUserDetailsService;
import com.yashwanth.portfolio.service.AuthService;
import com.yashwanth.portfolio.utils.SecurityUtils;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PortfolioUserDetailsService userDetailsService;
    private final AdminUserRepository adminUserRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;
    private final AdminProperties adminProperties;
    private final MailService mailService;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        AdminUser user;
        try {
            user = getUser(request.identifier());
        } catch (ResourceNotFoundException exception) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (isLockExpired(user)) {
            resetFailedLoginState(user);
        }
        if (isAccountLocked(user)) {
            throw new UnauthorizedException("Account locked until " + user.getAccountLockedUntil() + " due to repeated failed login attempts");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.identifier(), request.password())
            );
        } catch (AuthenticationException ex) {
            registerFailedAttempt(user, request.identifier(), ipAddress);
            throw new UnauthorizedException(buildInvalidLoginMessage(user));
        }

        resetFailedLoginState(user);
        return buildAuthResponse(user);
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (revokedTokenRepository.existsByTokenAndDeletedFalse(request.refreshToken())) {
            throw new BadRequestException("Refresh token has been revoked");
        }
        if (!jwtService.isTokenParsable(request.refreshToken())) {
            throw new BadRequestException("Refresh token is invalid");
        }
        String username = jwtService.extractUsername(request.refreshToken());
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(request.refreshToken(), userDetails, "refresh")) {
            throw new BadRequestException("Refresh token is invalid or expired");
        }
        return buildAuthResponse(getUser(username));
    }

    @Override
    @Transactional
    public void logout(String token) {
        if (token == null || token.isBlank() || !jwtService.isTokenParsable(token)) {
            return;
        }
        RevokedToken revokedToken = new RevokedToken();
        revokedToken.setToken(token);
        revokedToken.setExpiresAt(OffsetDateTime.ofInstant(jwtService.extractExpiration(token), ZoneOffset.UTC));
        revokedTokenRepository.save(revokedToken);
        revokedTokenRepository.deleteByExpiresAtBefore(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        AdminUser user = getUser(SecurityUtils.currentUserEmail());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        resetFailedLoginState(user);
        adminUserRepository.save(user);
        invalidateActiveResetTokens(user);
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        AdminUser user = getUser(request.email());
        passwordResetTokenRepository.deleteByExpiresAtBefore(OffsetDateTime.now(ZoneOffset.UTC));
        invalidateActiveResetTokens(user);
        PasswordResetToken token = new PasswordResetToken();
        token.setToken(UUID.randomUUID().toString());
        token.setUser(user);
        token.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(securityProperties.passwordResetExpirationMinutes()));
        token.setUsed(false);
        passwordResetTokenRepository.save(token);
        mailService.sendPasswordResetMail(user.getEmail(), "Use this token to reset your password: " + token.getToken());
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByTokenAndUsedFalseAndDeletedFalse(request.token())
                .orElseThrow(() -> new ResourceNotFoundException("Reset token not found"));
        if (token.getExpiresAt().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new BadRequestException("Reset token has expired");
        }
        AdminUser user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        resetFailedLoginState(user);
        token.setUsed(true);
        adminUserRepository.save(user);
        passwordResetTokenRepository.save(token);
        invalidateActiveResetTokens(user);
    }

    @Override
    public AdminProfileResponse currentUser() {
        return PortfolioMapper.toAdminProfile(getUser(SecurityUtils.currentUserEmail()));
    }

    @Override
    public boolean validate(String token) {
        if (token == null || token.isBlank() || revokedTokenRepository.existsByTokenAndDeletedFalse(token) || !jwtService.isTokenParsable(token)) {
            return false;
        }
        String username = jwtService.extractUsername(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        return jwtService.isTokenValid(token, userDetails, "access");
    }

    private AdminUser getUser(String identifier) {
        return adminUserRepository.findByEmailOrMobileNumberAndDeletedFalse(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found"));
    }

    private AuthResponse buildAuthResponse(AdminUser user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        return new AuthResponse(
                jwtService.generateAccessToken(userDetails),
                jwtService.generateRefreshToken(userDetails),
                "Bearer",
                3600L,
                PortfolioMapper.toAdminProfile(user)
        );
    }

    private void invalidateActiveResetTokens(AdminUser user) {
        List<PasswordResetToken> activeTokens = passwordResetTokenRepository.findByUserAndUsedFalseAndDeletedFalse(user);
        activeTokens.forEach(existing -> existing.setUsed(true));
        if (!activeTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(activeTokens);
        }
    }

    private void registerFailedAttempt(AdminUser user, String identifier, String ipAddress) {
        int nextAttemptCount = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(nextAttemptCount);

        if (nextAttemptCount >= securityProperties.loginMaxFailedAttempts()) {
            user.setAccountLockedUntil(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(securityProperties.loginLockDurationMinutes()));
            mailService.sendFailedLoginAlert(
                    adminProperties.email(),
                    identifier,
                    ipAddress,
                    OffsetDateTime.now(ZoneOffset.UTC).toString()
            );
        }

        adminUserRepository.save(user);
    }

    private String buildInvalidLoginMessage(AdminUser user) {
        if (isAccountLocked(user)) {
            return "Too many failed login attempts. Account locked until " + user.getAccountLockedUntil();
        }
        int remainingAttempts = Math.max(0, securityProperties.loginMaxFailedAttempts() - user.getFailedLoginAttempts());
        return "Invalid credentials. " + remainingAttempts + " login attempt(s) remaining before temporary lock.";
    }

    private boolean isAccountLocked(AdminUser user) {
        return user.getAccountLockedUntil() != null && user.getAccountLockedUntil().isAfter(OffsetDateTime.now(ZoneOffset.UTC));
    }

    private boolean isLockExpired(AdminUser user) {
        return user.getAccountLockedUntil() != null && !user.getAccountLockedUntil().isAfter(OffsetDateTime.now(ZoneOffset.UTC));
    }

    private void resetFailedLoginState(AdminUser user) {
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        adminUserRepository.save(user);
    }
}
