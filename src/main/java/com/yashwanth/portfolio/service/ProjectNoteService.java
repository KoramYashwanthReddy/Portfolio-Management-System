package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.ProjectNoteRequest;
import com.yashwanth.portfolio.dto.response.ProjectNoteResponse;
import com.yashwanth.portfolio.entity.ProjectNoteType;
import java.util.List;

public interface ProjectNoteService {
    List<ProjectNoteResponse> getAll(Long projectId, String search, ProjectNoteType type, Boolean pinned, String sortBy, String sortDirection);

    ProjectNoteResponse create(Long projectId, ProjectNoteRequest request);

    ProjectNoteResponse update(Long projectId, Long noteId, ProjectNoteRequest request);

    void delete(Long projectId, Long noteId);
}
