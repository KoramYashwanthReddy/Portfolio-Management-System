package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.entity.FileType;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.service.FileStorageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/files")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminFileController {

    private final FileStorageService fileStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<?>> upload(@RequestPart("file") MultipartFile file,
                                                 @RequestParam FileType fileType) {
        return ResponseEntity.ok(ApiResponse.success(
                "File uploaded successfully",
                PortfolioMapper.toStoredFile(fileStorageService.store(file, fileType))
        ));
    }
}
