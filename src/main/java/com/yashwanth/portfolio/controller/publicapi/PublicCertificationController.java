package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.service.CertificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/certifications")
@RequiredArgsConstructor
public class PublicCertificationController {

    private final CertificationService certificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Certifications fetched successfully", certificationService.getAll()));
    }
}
