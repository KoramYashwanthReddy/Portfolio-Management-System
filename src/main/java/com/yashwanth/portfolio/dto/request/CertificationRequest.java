package com.yashwanth.portfolio.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CertificationRequest(
        @NotBlank String title,
        @NotBlank String issuer,
        @NotNull LocalDate issueDate,
        LocalDate expiryDate,
        String credentialId,
        String credentialUrl,
        Long certificateFileId
) {
}
