package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.AboutRequest;
import com.yashwanth.portfolio.dto.response.AboutResponse;
import com.yashwanth.portfolio.entity.About;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.AboutRepository;
import com.yashwanth.portfolio.service.AboutService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AboutServiceImpl implements AboutService {

    private final AboutRepository aboutRepository;

    @Override
    @Transactional
    public AboutResponse upsert(AboutRequest request) {
        About about = aboutRepository.findTopByDeletedFalseOrderByUpdatedAtDesc().orElseGet(About::new);
        about.setName(request.name());
        about.setDesignation(request.designation());
        about.setBiography(request.biography());
        about.setExperienceYears(request.experienceYears());
        about.setCurrentLocation(request.currentLocation());
        about.setEmail(request.email());
        about.setPhone(request.phone());
        about.setLinkedinUrl(request.linkedinUrl());
        about.setGithubUrl(request.githubUrl());
        about.setPortfolioUrl(request.portfolioUrl());
        about.setProfileImageUrl(request.profileImageUrl());
        about.setHeadlineTicker(request.headlineTicker());
        about.setMarqueeWords(request.marqueeWords());
        return PortfolioMapper.toAbout(aboutRepository.save(about));
    }

    @Override
    @Transactional(readOnly = true)
    public AboutResponse get() {
        return PortfolioMapper.toAbout(aboutRepository.findTopByDeletedFalseOrderByUpdatedAtDesc()
                .orElseThrow(() -> new ResourceNotFoundException("About information not found")));
    }
}
