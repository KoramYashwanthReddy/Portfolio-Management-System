package com.yashwanth.portfolio.dto.response;

import java.time.Instant;

public record ContactMessageResponse(
        Long id,
        String name,
        String email,
        String subject,
        String message,
        boolean readStatus,
        boolean starred,
        boolean archived,
        boolean deleted,
        Instant createdAt
) {
}
