package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.ResumeResponse;
import com.yashwanth.portfolio.service.ResumeService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/resume")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminResumeController {

    private final ResumeService resumeService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ResumeResponse>> upload(@RequestPart("file") MultipartFile file,
                                                              @RequestParam(defaultValue = "latest") String versionLabel) {
        return ResponseEntity.ok(ApiResponse.success("Resume uploaded successfully", resumeService.upload(file, versionLabel)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ResumeResponse>> metadata() {
        return ResponseEntity.ok(ApiResponse.success("Resume metadata fetched successfully", resumeService.getCurrent()));
    }
}
