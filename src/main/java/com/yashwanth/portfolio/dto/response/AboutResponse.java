package com.yashwanth.portfolio.dto.response;

public record AboutResponse(
        Long id,
        String name,
        String designation,
        String biography,
        Integer experienceYears,
        String currentLocation,
        String email,
        String phone,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl,
        String profileImageUrl,
        String headlineTicker,
        String marqueeWords
) {
}
