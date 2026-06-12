package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.PageResponse;
import com.yashwanth.portfolio.dto.response.ProjectResponse;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import com.yashwanth.portfolio.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/projects")
@RequiredArgsConstructor
public class PublicProjectController {

    private final ProjectService projectService;

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

    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<?>> featured() {
        return ResponseEntity.ok(ApiResponse.success("Featured projects fetched successfully", projectService.featuredProjects()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Project fetched successfully", projectService.getById(id)));
    }
}
