package com.yashwanth.portfolio.dto.response;

import com.yashwanth.portfolio.entity.ProjectNoteType;
import java.time.Instant;
import java.util.List;

public record ProjectNoteResponse(
        Long id,
        String title,
        ProjectNoteType type,
        String content,
        List<String> tags,
        boolean pinned,
        Instant createdAt,
        Instant updatedAt
) {
}
