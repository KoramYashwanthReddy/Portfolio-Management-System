package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.response.ResumeResponse;
import com.yashwanth.portfolio.entity.FileType;
import com.yashwanth.portfolio.entity.Resume;
import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.ResumeRepository;
import com.yashwanth.portfolio.service.FileStorageService;
import com.yashwanth.portfolio.service.ResumeService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService {

    private final ResumeRepository resumeRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public ResumeResponse upload(MultipartFile file, String versionLabel) {
        resumeRepository.findByDeletedFalseOrderByCreatedAtDesc().forEach(existing -> {
            existing.setActive(false);
            resumeRepository.save(existing);
        });
        StoredFile storedFile = fileStorageService.store(file, FileType.RESUME);
        Resume resume = new Resume();
        resume.setStoredFile(storedFile);
        resume.setVersionLabel(versionLabel);
        resume.setActive(true);
        return PortfolioMapper.toResume(resumeRepository.save(resume));
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeResponse getCurrent() {
        return PortfolioMapper.toResume(getCurrentEntity());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumeResponse> getAll() {
        return resumeRepository.findByDeletedFalseOrderByCreatedAtDesc().stream()
                .map(PortfolioMapper::toResume)
                .toList();
    }

    @Override
    @Transactional
    public ResumeResponse activate(Long id) {
        Resume selected = getEntity(id);
        resumeRepository.findByDeletedFalseOrderByCreatedAtDesc().forEach(resume -> resume.setActive(false));
        selected.setActive(true);
        resumeRepository.save(selected);
        return PortfolioMapper.toResume(selected);
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFile download() {
        StoredFile storedFile = getCurrentEntity().getStoredFile();
        storedFile.getStoragePath();
        storedFile.getContentType();
        storedFile.getOriginalFileName();
        return storedFile;
    }

    private Resume getCurrentEntity() {
        return resumeRepository.findFirstByActiveTrueAndDeletedFalseOrderByCreatedAtDesc()
                .orElseGet(() -> resumeRepository.findTopByDeletedFalseOrderByCreatedAtDesc()
                        .orElseThrow(() -> new ResourceNotFoundException("Resume not found")));
    }

    private Resume getEntity(Long id) {
        return resumeRepository.findById(id)
                .filter(resume -> !resume.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
    }

}
