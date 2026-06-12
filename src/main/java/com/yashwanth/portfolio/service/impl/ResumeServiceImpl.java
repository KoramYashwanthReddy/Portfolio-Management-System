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
        resumeRepository.findTopByDeletedFalseOrderByCreatedAtDesc().ifPresent(existing -> {
            existing.setDeleted(true);
            resumeRepository.save(existing);
        });
        StoredFile storedFile = fileStorageService.store(file, FileType.RESUME);
        Resume resume = new Resume();
        resume.setStoredFile(storedFile);
        resume.setVersionLabel(versionLabel);
        return PortfolioMapper.toResume(resumeRepository.save(resume));
    }

    @Override
    public ResumeResponse getCurrent() {
        return PortfolioMapper.toResume(getEntity());
    }

    @Override
    public StoredFile download() {
        return getEntity().getStoredFile();
    }

    private Resume getEntity() {
        return resumeRepository.findTopByDeletedFalseOrderByCreatedAtDesc()
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
    }
}
