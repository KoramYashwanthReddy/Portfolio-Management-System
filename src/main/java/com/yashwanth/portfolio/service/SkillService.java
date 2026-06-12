package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.SkillRequest;
import com.yashwanth.portfolio.dto.response.SkillResponse;
import com.yashwanth.portfolio.entity.SkillCategory;
import java.util.List;

public interface SkillService {
    SkillResponse create(SkillRequest request);

    SkillResponse update(Long id, SkillRequest request);

    void delete(Long id);

    List<SkillResponse> getAll(SkillCategory category);
}
