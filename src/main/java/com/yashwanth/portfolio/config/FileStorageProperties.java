package com.yashwanth.portfolio.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.file")
public record FileStorageProperties(
        String uploadDir,
        long maxFileSize,
        List<String> allowedImageTypes,
        List<String> allowedDocumentTypes
) {
}
