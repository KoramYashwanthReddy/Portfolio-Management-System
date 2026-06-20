package com.yashwanth.portfolio.dto.request;

import com.yashwanth.portfolio.entity.ProjectNoteType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProjectNoteRequest(
        @NotBlank @Size(max = 120) String title,
        @NotNull ProjectNoteType type,
        @NotBlank @Size(max = 4000) String content,
        @Size(max = 500) String tags,
        Boolean pinned
) {
}
