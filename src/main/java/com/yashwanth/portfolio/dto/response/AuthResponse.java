package com.yashwanth.portfolio.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        AdminProfileResponse profile
) {
}
