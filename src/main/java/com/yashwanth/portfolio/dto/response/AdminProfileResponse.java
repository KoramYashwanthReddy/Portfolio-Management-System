package com.yashwanth.portfolio.dto.response;

import com.yashwanth.portfolio.entity.Role;
import java.time.Instant;

public record AdminProfileResponse(
        Long id,
        String name,
        String email,
        Role role,
        Instant createdAt
) {
}
