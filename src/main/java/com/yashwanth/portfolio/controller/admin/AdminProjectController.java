package com.yashwanth.portfolio.controller.admin;

import com.yashwanth.portfolio.dto.request.ProjectRequest;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.PageResponse;
import com.yashwanth.portfolio.dto.response.ProjectResponse;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import com.yashwanth.portfolio.service.ProjectService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(@Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Project created successfully", projectService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", projectService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Project fetched successfully", projectService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProjectResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ProjectCategory category,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) Boolean featured) {
        return ResponseEntity.ok(ApiResponse.success(
                "Projects fetched successfully",
                projectService.getAll(page, size, sortBy, sortDirection, search, category, status, featured)
        ));
    }
}
