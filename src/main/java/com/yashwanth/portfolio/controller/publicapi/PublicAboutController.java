package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.service.AboutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/about")
@RequiredArgsConstructor
public class PublicAboutController {

    private final AboutService aboutService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> get() {
        return ResponseEntity.ok(ApiResponse.success("About information fetched successfully", aboutService.get()));
    }
}
