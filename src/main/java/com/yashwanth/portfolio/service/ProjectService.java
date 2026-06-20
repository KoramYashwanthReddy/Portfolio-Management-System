package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.ProjectRequest;
import com.yashwanth.portfolio.dto.response.PageResponse;
import com.yashwanth.portfolio.dto.response.ProjectResponse;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import java.util.List;

public interface ProjectService {
    ProjectResponse create(ProjectRequest request);

    ProjectResponse update(Long id, ProjectRequest request);

    void delete(Long id);

    ProjectResponse getById(Long id);

    PageResponse<ProjectResponse> getAll(int page, int size, String sortBy, String sortDirection,
                                         String search, ProjectCategory category, ProjectStatus status, Boolean featured, Boolean displayed);

    List<ProjectResponse> featuredProjects();
}
