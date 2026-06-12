package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.service.FileStorageService;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/files")
@RequiredArgsConstructor
public class PublicFileController {

    private final FileStorageService fileStorageService;

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws IOException {
        StoredFile storedFile = fileStorageService.getById(id);
        Resource resource = fileStorageService.loadAsResource(storedFile);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(storedFile.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + storedFile.getOriginalFileName() + "\"")
                .contentLength(resource.contentLength())
                .body(resource);
    }
}
