package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.CertificationRequest;
import com.yashwanth.portfolio.dto.response.CertificationResponse;
import java.util.List;

public interface CertificationService {
    CertificationResponse create(CertificationRequest request);

    CertificationResponse update(Long id, CertificationRequest request);

    void delete(Long id);

    List<CertificationResponse> getAll(Boolean displayed);
}
