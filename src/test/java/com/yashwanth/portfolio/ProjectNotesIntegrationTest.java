package com.yashwanth.portfolio;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yashwanth.portfolio.entity.Project;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import com.yashwanth.portfolio.repository.ProjectRepository;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class ProjectNotesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProjectRepository projectRepository;

    @Test
    void projectNotesAreStoredWithAuditTimestamps() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "identifier", "admin@test.local",
                                "password", "ChangeMe@123"
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode loginBody = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String accessToken = loginBody.path("data").path("accessToken").asText();

        Project project = new Project();
        project.setTitle("Notes demo project");
        project.setShortDescription("Track the work behind a feature");
        project.setDetailedDescription("Used for verifying timestamped project notes.");
        project.setTechnologies("Spring Boot, JWT, Swagger");
        project.setCategory(ProjectCategory.WEB);
        project.setStatus(ProjectStatus.COMPLETED);
        project.setFeatured(false);
        project.setDisplayed(true);
        project.setCompletionDate(LocalDate.now());
        Project savedProject = projectRepository.save(project);

        MvcResult createResult = mockMvc.perform(post("/admin/projects/{projectId}/notes", savedProject.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Added refresh flow",
                                "type", "FEATURE_USED",
                                "content", "Integrated token refresh to keep the admin session alive.",
                                "tags", "Spring Boot, JWT, Spring Boot",
                                "pinned", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.tags[0]").value("Spring Boot"))
                .andExpect(jsonPath("$.data.tags[1]").value("JWT"))
                .andReturn();

        JsonNode createBody = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long noteId = createBody.path("data").path("id").asLong();

        mockMvc.perform(get("/admin/projects/{projectId}/notes", savedProject.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Added refresh flow"))
                .andExpect(jsonPath("$.data[0].pinned").value(true));

        mockMvc.perform(delete("/admin/projects/{projectId}/notes/{noteId}", savedProject.getId(), noteId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
