package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.response.DashboardResponse;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.CertificationRepository;
import com.yashwanth.portfolio.repository.ContactMessageRepository;
import com.yashwanth.portfolio.repository.ProjectRepository;
import com.yashwanth.portfolio.repository.SkillRepository;
import com.yashwanth.portfolio.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ProjectRepository projectRepository;
    private final SkillRepository skillRepository;
    private final CertificationRepository certificationRepository;
    private final ContactMessageRepository contactMessageRepository;

    @Override
    public DashboardResponse getDashboard() {
        return new DashboardResponse(
                projectRepository.countByDeletedFalse(),
                skillRepository.countByDeletedFalse(),
                certificationRepository.countByDeletedFalse(),
                contactMessageRepository.countByDeletedFalse(),
                projectRepository.countByFeaturedTrueAndDeletedFalse(),
                contactMessageRepository.findTop5ByDeletedFalseOrderByCreatedAtDesc().stream().map(PortfolioMapper::toContactMessage).toList(),
                projectRepository.findTop5ByDeletedFalseOrderByCreatedAtDesc().stream().map(PortfolioMapper::toProject).toList()
        );
    }
}
