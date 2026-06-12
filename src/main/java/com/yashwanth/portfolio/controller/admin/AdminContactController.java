package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import com.yashwanth.portfolio.service.ContactService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/messages")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminContactController {

    private final ContactService contactService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Messages fetched successfully", contactService.getAll()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message marked as read", contactService.markAsRead(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        contactService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Message deleted successfully", null));
    }
}
