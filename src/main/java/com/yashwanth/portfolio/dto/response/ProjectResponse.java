package com.yashwanth.portfolio.dto.response;

import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import java.time.LocalDate;
import java.time.Instant;

public record ProjectResponse(
        Long id,
        String title,
        String shortDescription,
        String detailedDescription,
        String technologies,
        String githubUrl,
        String liveUrl,
        String imageUrl,
        ProjectCategory category,
        ProjectStatus status,
        boolean featured,
        LocalDate completionDate,
        Instant createdAt,
        Instant updatedAt,
        StoredFileResponse imageFile
) {
}
