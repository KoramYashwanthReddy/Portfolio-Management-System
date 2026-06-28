package com.yashwanth.portfolio.dto.request;

import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ProjectRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank @Size(max = 250) String shortDescription,
        @NotBlank String detailedDescription,
        @NotBlank @Size(max = 500) String technologies,
        String githubUrl,
        String liveUrl,
        String imageUrl,
        String videoUrl,
        @NotNull ProjectCategory category,
        @NotNull ProjectStatus status,
        boolean featured,
        Boolean displayed,
        LocalDate completionDate,
        Long imageFileId,
        Long videoFileId
) {
}
