package com.yashwanth.portfolio.dto.response;

import java.time.Instant;

public record ResumeResponse(
        Long id,
        String versionLabel,
        Instant uploadedAt,
        StoredFileResponse file
) {
}
