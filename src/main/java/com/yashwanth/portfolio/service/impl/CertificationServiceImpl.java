package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.CertificationRequest;
import com.yashwanth.portfolio.dto.response.CertificationResponse;
import com.yashwanth.portfolio.entity.Certification;
import com.yashwanth.portfolio.exception.BadRequestException;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.CertificationRepository;
import com.yashwanth.portfolio.service.CertificationService;
import com.yashwanth.portfolio.service.FileStorageService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationServiceImpl implements CertificationService {

    private final CertificationRepository certificationRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public CertificationResponse create(CertificationRequest request) {
        Certification certification = new Certification();
        apply(certification, request);
        validateUnique(certification.getTitle(), certification.getIssuer(), null);
        return PortfolioMapper.toCertification(certificationRepository.save(certification));
    }

    @Override
    @Transactional
    public CertificationResponse update(Long id, CertificationRequest request) {
        Certification certification = getEntity(id);
        apply(certification, request);
        validateUnique(certification.getTitle(), certification.getIssuer(), id);
        return PortfolioMapper.toCertification(certificationRepository.save(certification));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Certification certification = getEntity(id);
        certification.setDeleted(true);
        certificationRepository.save(certification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificationResponse> getAll(Boolean displayed) {
        return certificationRepository.findByDeletedFalseOrderByIssueDateDesc()
                .stream()
                .filter(certification -> displayed == null || (displayed
                        ? certification.getDisplayed() == null || Boolean.TRUE.equals(certification.getDisplayed())
                        : Boolean.FALSE.equals(certification.getDisplayed())))
                .map(PortfolioMapper::toCertification)
                .toList();
    }

    private Certification getEntity(Long id) {
        return certificationRepository.findById(id)
                .filter(certification -> !certification.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Certification not found"));
    }

    private void apply(Certification certification, CertificationRequest request) {
        certification.setTitle(request.title().trim());
        certification.setIssuer(request.issuer().trim());
        certification.setIssueDate(request.issueDate());
        certification.setExpiryDate(request.expiryDate());
        certification.setCredentialId(request.credentialId());
        certification.setCredentialUrl(request.credentialUrl());
        certification.setCertificateFile(request.certificateFileId() != null ? fileStorageService.getById(request.certificateFileId()) : null);
        certification.setDisplayed(request.displayed() == null ? Boolean.TRUE : request.displayed());
    }

    private void validateUnique(String title, String issuer, Long id) {
        boolean exists = id == null
                ? certificationRepository.existsByTitleIgnoreCaseAndIssuerIgnoreCaseAndDeletedFalse(title, issuer)
                : certificationRepository.existsByTitleIgnoreCaseAndIssuerIgnoreCaseAndDeletedFalseAndIdNot(title, issuer, id);
        if (exists) {
            throw new BadRequestException("Certification already exists.");
        }
    }
}
