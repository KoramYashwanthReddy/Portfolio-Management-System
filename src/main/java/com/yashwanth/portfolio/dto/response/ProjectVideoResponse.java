package com.yashwanth.portfolio.dto.response;

public record ProjectVideoResponse(
        Long id,
        String title,
        Integer sortOrder,
        StoredFileResponse videoFile
) {
}
