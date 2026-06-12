package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.SkillRequest;
import com.yashwanth.portfolio.dto.response.SkillResponse;
import com.yashwanth.portfolio.entity.Skill;
import com.yashwanth.portfolio.entity.SkillCategory;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.repository.SkillRepository;
import com.yashwanth.portfolio.service.SkillService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SkillServiceImpl implements SkillService {

    private final SkillRepository skillRepository;

    @Override
    @Transactional
    public SkillResponse create(SkillRequest request) {
        Skill skill = new Skill();
        apply(skill, request);
        return PortfolioMapper.toSkill(skillRepository.save(skill));
    }

    @Override
    @Transactional
    public SkillResponse update(Long id, SkillRequest request) {
        Skill skill = getEntity(id);
        apply(skill, request);
        return PortfolioMapper.toSkill(skillRepository.save(skill));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Skill skill = getEntity(id);
        skill.setDeleted(true);
        skillRepository.save(skill);
    }

    @Override
    public List<SkillResponse> getAll(SkillCategory category) {
        List<Skill> skills = category == null
                ? skillRepository.findByDeletedFalseOrderByDisplayOrderAscSkillNameAsc()
                : skillRepository.findByCategoryAndDeletedFalseOrderByDisplayOrderAscSkillNameAsc(category);
        return skills.stream().map(PortfolioMapper::toSkill).toList();
    }

    private Skill getEntity(Long id) {
        return skillRepository.findById(id)
                .filter(skill -> !skill.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
    }

    private void apply(Skill skill, SkillRequest request) {
        skill.setSkillName(request.skillName());
        skill.setCategory(request.category());
        skill.setProficiencyPercentage(request.proficiencyPercentage());
        skill.setDisplayOrder(request.displayOrder());
    }
}
