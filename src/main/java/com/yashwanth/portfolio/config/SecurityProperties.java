package com.yashwanth.portfolio.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        @Min(5) long passwordResetExpirationMinutes,
        @Min(1) int loginMaxFailedAttempts,
        @Min(1) long loginLockDurationMinutes
) {
}
