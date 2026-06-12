package com.yashwanth.portfolio.config;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.admin")
public record AdminProperties(
        @NotBlank String name,
        @Email @NotBlank String email,
        String mobileNumber,
        @NotBlank String password
) {
}
