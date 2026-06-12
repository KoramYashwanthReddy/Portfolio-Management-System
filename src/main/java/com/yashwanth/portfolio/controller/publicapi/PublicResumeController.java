package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.service.FileStorageService;
import com.yashwanth.portfolio.service.ResumeService;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/resume")
@RequiredArgsConstructor
public class PublicResumeController {

    private final ResumeService resumeService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> metadata() {
        return ResponseEntity.ok(ApiResponse.success("Resume metadata fetched successfully", resumeService.getCurrent()));
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> download() throws IOException {
        StoredFile storedFile = resumeService.download();
        Resource resource = fileStorageService.loadAsResource(storedFile);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(storedFile.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + storedFile.getOriginalFileName() + "\"")
                .contentLength(resource.contentLength())
                .body(resource);
    }
}
