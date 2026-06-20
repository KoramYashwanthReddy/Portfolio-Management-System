package com.yashwanth.portfolio.dto.response;

import com.yashwanth.portfolio.entity.SkillCategory;

public record SkillResponse(
        Long id,
        String skillName,
        SkillCategory category,
        Integer proficiencyPercentage,
        Integer displayOrder,
        Boolean displayed
) {
}
