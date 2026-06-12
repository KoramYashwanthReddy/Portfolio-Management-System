package com.yashwanth.portfolio.dto.response;

import java.time.OffsetDateTime;
import java.util.Map;

public record ErrorResponse(
        boolean success,
        String message,
        Map<String, String> errors,
        OffsetDateTime timestamp
) {
}
