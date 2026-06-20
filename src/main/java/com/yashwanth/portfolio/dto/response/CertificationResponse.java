package com.yashwanth.portfolio.dto.response;

import java.time.LocalDate;

public record CertificationResponse(
        Long id,
        String title,
        String issuer,
        LocalDate issueDate,
        LocalDate expiryDate,
        String credentialId,
        String credentialUrl,
        Boolean displayed,
        StoredFileResponse certificateFile
) {
}
