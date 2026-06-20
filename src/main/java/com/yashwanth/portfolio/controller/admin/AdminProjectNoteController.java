package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.request.ProjectNoteRequest;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.ProjectNoteResponse;
import com.yashwanth.portfolio.entity.ProjectNoteType;
import com.yashwanth.portfolio.service.ProjectNoteService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/projects/{projectId}/notes")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminProjectNoteController {

    private final ProjectNoteService projectNoteService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectNoteResponse>>> getAll(
            @PathVariable Long projectId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ProjectNoteType type,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        return ResponseEntity.ok(ApiResponse.success(
                "Project notes fetched successfully",
                projectNoteService.getAll(projectId, search, type, pinned, sortBy, sortDirection)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectNoteResponse>> create(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectNoteRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Project note created successfully", projectNoteService.create(projectId, request)));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<ApiResponse<ProjectNoteResponse>> update(
            @PathVariable Long projectId,
            @PathVariable Long noteId,
            @Valid @RequestBody ProjectNoteRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Project note updated successfully", projectNoteService.update(projectId, noteId, request)));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long projectId, @PathVariable Long noteId) {
        projectNoteService.delete(projectId, noteId);
        return ResponseEntity.ok(ApiResponse.success("Project note deleted successfully", null));
    }
}
