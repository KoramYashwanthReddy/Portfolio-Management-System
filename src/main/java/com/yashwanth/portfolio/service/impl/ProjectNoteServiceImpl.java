package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.ProjectNoteRequest;
import com.yashwanth.portfolio.dto.response.ProjectNoteResponse;
import com.yashwanth.portfolio.entity.Project;
import com.yashwanth.portfolio.entity.ProjectNote;
import com.yashwanth.portfolio.entity.ProjectNoteType;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.ProjectNoteRepository;
import com.yashwanth.portfolio.repository.ProjectRepository;
import com.yashwanth.portfolio.service.ProjectNoteService;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectNoteServiceImpl implements ProjectNoteService {

    private final ProjectRepository projectRepository;
    private final ProjectNoteRepository projectNoteRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectNoteResponse> getAll(Long projectId, String search, ProjectNoteType type, Boolean pinned, String sortBy, String sortDirection) {
        ensureProjectExists(projectId);
        List<ProjectNote> notes = projectNoteRepository.findByProjectIdAndDeletedFalse(projectId).stream()
                .filter(note -> matchesSearch(note, search))
                .filter(note -> type == null || note.getType() == type)
                .filter(note -> pinned == null || note.isPinned() == pinned)
                .sorted(buildComparator(sortBy, sortDirection))
                .toList();
        return notes
                .stream()
                .map(PortfolioMapper::toProjectNote)
                .toList();
    }

    @Override
    @Transactional
    public ProjectNoteResponse create(Long projectId, ProjectNoteRequest request) {
        Project project = ensureProjectExists(projectId);
        ProjectNote note = new ProjectNote();
        note.setProject(project);
        apply(note, request);
        return PortfolioMapper.toProjectNote(projectNoteRepository.save(note));
    }

    @Override
    @Transactional
    public ProjectNoteResponse update(Long projectId, Long noteId, ProjectNoteRequest request) {
        ProjectNote note = getNote(projectId, noteId);
        apply(note, request);
        return PortfolioMapper.toProjectNote(projectNoteRepository.save(note));
    }

    @Override
    @Transactional
    public void delete(Long projectId, Long noteId) {
        ProjectNote note = getNote(projectId, noteId);
        note.setDeleted(true);
        projectNoteRepository.save(note);
    }

    private Project ensureProjectExists(Long projectId) {
        return projectRepository.findById(projectId)
                .filter(project -> !project.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private ProjectNote getNote(Long projectId, Long noteId) {
        ensureProjectExists(projectId);
        return projectNoteRepository.findByIdAndProjectIdAndDeletedFalse(noteId, projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project note not found"));
    }

    private void apply(ProjectNote note, ProjectNoteRequest request) {
        note.setTitle(request.title().trim());
        note.setType(request.type());
        note.setContent(request.content().trim());
        note.setTags(normalizeTags(request.tags()));
        note.setPinned(request.pinned() != null && request.pinned());
    }

    private boolean matchesSearch(ProjectNote note, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String needle = search.toLowerCase();
        return contains(note.getTitle(), needle)
                || contains(note.getContent(), needle)
                || contains(note.getTags(), needle)
                || contains(note.getType() != null ? note.getType().name() : null, needle);
    }

    private boolean contains(String value, String needle) {
        return value != null && value.toLowerCase().contains(needle);
    }

    private Comparator<ProjectNote> buildComparator(String sortBy, String sortDirection) {
        Comparator<ProjectNote> comparator = Comparator.comparing(ProjectNote::isPinned).reversed();
        Comparator<ProjectNote> fieldComparator = switch (sortBy == null ? "createdAt" : sortBy) {
            case "updatedAt" -> Comparator.comparing(ProjectNote::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
            case "title" -> Comparator.comparing((ProjectNote note) -> note.getTitle() == null ? "" : note.getTitle().toLowerCase());
            default -> Comparator.comparing(ProjectNote::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
        };
        return comparator.thenComparing("ASC".equalsIgnoreCase(sortDirection) ? fieldComparator : fieldComparator.reversed());
    }

    private String normalizeTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return null;
        }
        return java.util.Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .collect(java.util.stream.Collectors.toMap(
                        tag -> tag.toLowerCase(),
                        tag -> tag,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ))
                .values()
                .stream()
                .limit(12)
                .reduce((left, right) -> left + ", " + right)
                .orElse(null);
    }
}
