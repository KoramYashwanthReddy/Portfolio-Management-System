package com.yashwanth.portfolio.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AboutRequest(
        @NotBlank String name,
        @NotBlank String designation,
        @NotBlank String biography,
        @NotNull @Min(0) Integer experienceYears,
        @NotBlank String currentLocation,
        @Email @NotBlank String email,
        String phone,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl
) {
}
