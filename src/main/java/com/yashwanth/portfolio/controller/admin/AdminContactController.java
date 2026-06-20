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

    @GetMapping("/archived")
    public ResponseEntity<ApiResponse<?>> getArchived() {
        return ResponseEntity.ok(ApiResponse.success("Archived messages fetched successfully", contactService.getArchived()));
    }

    @GetMapping("/deleted")
    public ResponseEntity<ApiResponse<?>> getDeleted() {
        return ResponseEntity.ok(ApiResponse.success("Deleted messages fetched successfully", contactService.getDeleted()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message marked as read", contactService.markAsRead(id)));
    }

    @PatchMapping("/{id}/unread")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> markAsUnread(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message marked as unread", contactService.markAsUnread(id)));
    }

    @PatchMapping("/{id}/star")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> star(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message starred successfully", contactService.star(id)));
    }

    @PatchMapping("/{id}/unstar")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> unstar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message unstarred successfully", contactService.unstar(id)));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> archive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message archived successfully", contactService.archive(id)));
    }

    @PatchMapping("/{id}/unarchive")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> unarchive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message unarchived successfully", contactService.unarchive(id)));
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> restore(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Message restored successfully", contactService.restore(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        contactService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Message deleted successfully", null));
    }

    @DeleteMapping("/{id}/purge")
    public ResponseEntity<ApiResponse<Void>> purge(@PathVariable Long id) {
        contactService.purge(id);
        return ResponseEntity.ok(ApiResponse.success("Message permanently deleted successfully", null));
    }
}
