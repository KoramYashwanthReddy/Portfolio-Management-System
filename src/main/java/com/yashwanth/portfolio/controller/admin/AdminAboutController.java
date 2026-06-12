package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.request.AboutRequest;
import com.yashwanth.portfolio.dto.response.AboutResponse;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.service.AboutService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/about")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminAboutController {

    private final AboutService aboutService;

    @PutMapping
    public ResponseEntity<ApiResponse<AboutResponse>> update(@Valid @RequestBody AboutRequest request) {
        return ResponseEntity.ok(ApiResponse.success("About information updated successfully", aboutService.upsert(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> get() {
        return ResponseEntity.ok(ApiResponse.success("About information fetched successfully", aboutService.get()));
    }
}
