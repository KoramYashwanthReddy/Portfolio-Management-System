package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.SkillRequest;
import com.yashwanth.portfolio.dto.response.SkillResponse;
import com.yashwanth.portfolio.entity.Skill;
import com.yashwanth.portfolio.entity.SkillCategory;
import com.yashwanth.portfolio.exception.BadRequestException;
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
        validateUnique(skill.getSkillName(), null);
        return PortfolioMapper.toSkill(skillRepository.save(skill));
    }

    @Override
    @Transactional
    public SkillResponse update(Long id, SkillRequest request) {
        Skill skill = getEntity(id);
        apply(skill, request);
        validateUnique(skill.getSkillName(), id);
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
    @Transactional(readOnly = true)
    public List<SkillResponse> getAll(SkillCategory category, Boolean displayed) {
        List<Skill> skills = category == null
                ? skillRepository.findByDeletedFalseOrderByDisplayOrderAscSkillNameAsc()
                : skillRepository.findByCategoryAndDeletedFalseOrderByDisplayOrderAscSkillNameAsc(category);
        return skills.stream()
                .filter(skill -> displayed == null || Boolean.TRUE.equals(skill.getDisplayed()) == displayed)
                .map(PortfolioMapper::toSkill)
                .toList();
    }

    private Skill getEntity(Long id) {
        return skillRepository.findById(id)
                .filter(skill -> !skill.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
    }

    private void apply(Skill skill, SkillRequest request) {
        skill.setSkillName(request.skillName().trim());
        skill.setCategory(request.category());
        skill.setProficiencyPercentage(request.proficiencyPercentage());
        skill.setDisplayOrder(request.displayOrder());
        skill.setDisplayed(request.displayed() == null ? Boolean.TRUE : request.displayed());
    }

    private void validateUnique(String skillName, Long id) {
        boolean exists = id == null
                ? skillRepository.existsBySkillNameIgnoreCaseAndDeletedFalse(skillName)
                : skillRepository.existsBySkillNameIgnoreCaseAndDeletedFalseAndIdNot(skillName, id);
        if (exists) {
            throw new BadRequestException("Skill already exists.");
        }
    }
}
