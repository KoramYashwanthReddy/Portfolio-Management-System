package com.yashwanth.portfolio.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactMessageRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @NotBlank @Size(max = 150) String subject,
        @NotBlank @Size(max = 5000) String message
) {
}
