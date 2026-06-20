package com.yashwanth.portfolio.dto.request;

import com.yashwanth.portfolio.entity.SkillCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SkillRequest(
        @NotBlank String skillName,
        @NotNull SkillCategory category,
        @NotNull @Min(0) @Max(100) Integer proficiencyPercentage,
        @NotNull @Min(0) Integer displayOrder,
        Boolean displayed
) {
}
