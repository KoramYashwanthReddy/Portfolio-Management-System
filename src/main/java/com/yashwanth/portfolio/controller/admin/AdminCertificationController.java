package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.request.CertificationRequest;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.CertificationResponse;
import com.yashwanth.portfolio.service.CertificationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/certifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminCertificationController {

    private final CertificationService certificationService;

    @PostMapping
    public ResponseEntity<ApiResponse<CertificationResponse>> create(@Valid @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Certification created successfully", certificationService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CertificationResponse>> update(@PathVariable Long id, @Valid @RequestBody CertificationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Certification updated successfully", certificationService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        certificationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Certification deleted successfully", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Certifications fetched successfully", certificationService.getAll(null)));
    }
}
