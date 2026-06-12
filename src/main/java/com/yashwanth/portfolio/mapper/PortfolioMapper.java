package com.yashwanth.portfolio.mapper;

import com.yashwanth.portfolio.dto.response.AboutResponse;
import com.yashwanth.portfolio.dto.response.AdminProfileResponse;
import com.yashwanth.portfolio.dto.response.CertificationResponse;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import com.yashwanth.portfolio.dto.response.ProjectResponse;
import com.yashwanth.portfolio.dto.response.ResumeResponse;
import com.yashwanth.portfolio.dto.response.SkillResponse;
import com.yashwanth.portfolio.dto.response.StoredFileResponse;
import com.yashwanth.portfolio.entity.About;
import com.yashwanth.portfolio.entity.AdminUser;
import com.yashwanth.portfolio.entity.Certification;
import com.yashwanth.portfolio.entity.ContactMessage;
import com.yashwanth.portfolio.entity.Project;
import com.yashwanth.portfolio.entity.Resume;
import com.yashwanth.portfolio.entity.Skill;
import com.yashwanth.portfolio.entity.StoredFile;

public final class PortfolioMapper {

    private PortfolioMapper() {
    }

    public static AdminProfileResponse toAdminProfile(AdminUser user) {
        return new AdminProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt());
    }

    public static StoredFileResponse toStoredFile(StoredFile storedFile) {
        if (storedFile == null) {
            return null;
        }
        return new StoredFileResponse(
                storedFile.getId(),
                storedFile.getOriginalFileName(),
                storedFile.getContentType(),
                storedFile.getSize(),
                storedFile.getFileType(),
                "/api/v1/public/files/" + storedFile.getId() + "/download"
        );
    }

    public static ProjectResponse toProject(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getTitle(),
                project.getShortDescription(),
                project.getDetailedDescription(),
                project.getTechnologies(),
                project.getGithubUrl(),
                project.getLiveUrl(),
                project.getImageUrl(),
                project.getCategory(),
                project.getStatus(),
                project.isFeatured(),
                project.getCompletionDate(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                toStoredFile(project.getImageFile())
        );
    }

    public static SkillResponse toSkill(Skill skill) {
        return new SkillResponse(skill.getId(), skill.getSkillName(), skill.getCategory(), skill.getProficiencyPercentage(), skill.getDisplayOrder());
    }

    public static CertificationResponse toCertification(Certification certification) {
        return new CertificationResponse(
                certification.getId(),
                certification.getTitle(),
                certification.getIssuer(),
                certification.getIssueDate(),
                certification.getExpiryDate(),
                certification.getCredentialId(),
                certification.getCredentialUrl(),
                toStoredFile(certification.getCertificateFile())
        );
    }

    public static ResumeResponse toResume(Resume resume) {
        return new ResumeResponse(resume.getId(), resume.getVersionLabel(), resume.getCreatedAt(), toStoredFile(resume.getStoredFile()));
    }

    public static ContactMessageResponse toContactMessage(ContactMessage message) {
        return new ContactMessageResponse(
                message.getId(),
                message.getName(),
                message.getEmail(),
                message.getSubject(),
                message.getMessage(),
                message.isReadStatus(),
                message.getCreatedAt()
        );
    }

    public static AboutResponse toAbout(About about) {
        return new AboutResponse(
                about.getId(),
                about.getName(),
                about.getDesignation(),
                about.getBiography(),
                about.getExperienceYears(),
                about.getCurrentLocation(),
                about.getEmail(),
                about.getPhone(),
                about.getLinkedinUrl(),
                about.getGithubUrl(),
                about.getPortfolioUrl()
        );
    }
}
