package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.ProjectRequest;
import com.yashwanth.portfolio.dto.response.PageResponse;
import com.yashwanth.portfolio.dto.response.ProjectResponse;
import com.yashwanth.portfolio.entity.Project;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.ProjectRepository;
import com.yashwanth.portfolio.service.FileStorageService;
import com.yashwanth.portfolio.service.ProjectService;
import com.yashwanth.portfolio.utils.PageMapper;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        Project project = new Project();
        apply(project, request);
        return PortfolioMapper.toProject(projectRepository.save(project));
    }

    @Override
    @Transactional
    public ProjectResponse update(Long id, ProjectRequest request) {
        Project project = getEntity(id);
        apply(project, request);
        return PortfolioMapper.toProject(projectRepository.save(project));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Project project = getEntity(id);
        project.setDeleted(true);
        projectRepository.save(project);
    }

    @Override
    public ProjectResponse getById(Long id) {
        return PortfolioMapper.toProject(getEntity(id));
    }

    @Override
    public PageResponse<ProjectResponse> getAll(int page, int size, String sortBy, String sortDirection, String search,
                                                ProjectCategory category, ProjectStatus status, Boolean featured) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        var result = projectRepository.findAll((root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.isFalse(root.get("deleted")));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("title")), pattern),
                        builder.like(builder.lower(root.get("shortDescription")), pattern),
                        builder.like(builder.lower(root.get("technologies")), pattern)
                ));
            }
            if (category != null) {
                predicates.add(builder.equal(root.get("category"), category));
            }
            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }
            if (featured != null) {
                predicates.add(builder.equal(root.get("featured"), featured));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        }, pageRequest);
        return PageMapper.map(result, PortfolioMapper::toProject);
    }

    @Override
    public List<ProjectResponse> featuredProjects() {
        return projectRepository.findAll((root, query, builder) -> builder.and(
                builder.isFalse(root.get("deleted")),
                builder.isTrue(root.get("featured"))
        )).stream().map(PortfolioMapper::toProject).toList();
    }

    private Project getEntity(Long id) {
        return projectRepository.findById(id)
                .filter(project -> !project.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private void apply(Project project, ProjectRequest request) {
        project.setTitle(request.title());
        project.setShortDescription(request.shortDescription());
        project.setDetailedDescription(request.detailedDescription());
        project.setTechnologies(request.technologies());
        project.setGithubUrl(request.githubUrl());
        project.setLiveUrl(request.liveUrl());
        project.setCategory(request.category());
        project.setStatus(request.status());
        project.setFeatured(request.featured());
        project.setCompletionDate(request.completionDate());
        StoredFile imageFile = request.imageFileId() != null ? fileStorageService.getById(request.imageFileId()) : null;
        project.setImageFile(imageFile);
        project.setImageUrl(imageFile != null ? "/api/v1/public/files/" + imageFile.getId() + "/download" : request.imageUrl());
    }
}
