package com.yashwanth.portfolio.dto.response;

import com.yashwanth.portfolio.entity.FileType;

public record StoredFileResponse(
        Long id,
        String originalFileName,
        String contentType,
        long size,
        FileType fileType,
        String downloadUrl
) {
}
