package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.entity.SkillCategory;
import com.yashwanth.portfolio.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/skills")
@RequiredArgsConstructor
public class PublicSkillController {

    private final SkillService skillService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(@RequestParam(required = false) SkillCategory category) {
        return ResponseEntity.ok(ApiResponse.success("Skills fetched successfully", skillService.getAll(category, true)));
    }
}
