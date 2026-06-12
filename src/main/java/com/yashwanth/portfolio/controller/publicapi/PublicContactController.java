package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.request.ContactMessageRequest;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import com.yashwanth.portfolio.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/contact")
@RequiredArgsConstructor
public class PublicContactController {

    private final ContactService contactService;

    @PostMapping
    public ResponseEntity<ApiResponse<ContactMessageResponse>> submit(@Valid @RequestBody ContactMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Message submitted successfully", contactService.submit(request)));
    }
}
