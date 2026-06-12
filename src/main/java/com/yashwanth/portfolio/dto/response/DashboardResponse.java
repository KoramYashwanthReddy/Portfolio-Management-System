package com.yashwanth.portfolio.dto.response;

import java.util.List;

public record DashboardResponse(
        long totalProjects,
        long totalSkills,
        long totalCertifications,
        long totalMessages,
        long totalFeaturedProjects,
        List<ContactMessageResponse> recentMessages,
        List<ProjectResponse> recentProjects
) {
}
