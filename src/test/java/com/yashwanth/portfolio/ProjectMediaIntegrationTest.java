package com.yashwanth.portfolio;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yashwanth.portfolio.entity.FileType;
import com.yashwanth.portfolio.entity.ProjectCategory;
import com.yashwanth.portfolio.entity.ProjectStatus;
import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.repository.StoredFileRepository;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class ProjectMediaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StoredFileRepository storedFileRepository;

    @Test
    void projectCreationSupportsMultipleImagesAndTitledVideos() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "identifier", "admin@test.local",
                                "password", "ChangeMe@123"
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode loginBody = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String accessToken = loginBody.path("data").path("accessToken").asText();

        StoredFile imageOne = storedFileRepository.save(buildFile("screen-1.png", "image/png", FileType.PROJECT_IMAGE));
        StoredFile imageTwo = storedFileRepository.save(buildFile("screen-2.webp", "image/webp", FileType.PROJECT_IMAGE));
        StoredFile videoOne = storedFileRepository.save(buildFile("walkthrough-1.mp4", "video/mp4", FileType.PROJECT_VIDEO));
        StoredFile videoTwo = storedFileRepository.save(buildFile("walkthrough-2.webm", "video/webm", FileType.PROJECT_VIDEO));

        mockMvc.perform(post("/admin/projects")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Media rich project",
                                "shortDescription", "Shows multiple screenshots and videos",
                                "detailedDescription", "A project that exercises the full media payload.",
                                "technologies", "Spring Boot, React, PostgreSQL",
                                "category", ProjectCategory.WEB,
                                "status", ProjectStatus.COMPLETED,
                                "featured", true,
                                "displayed", true,
                                "imageFileIds", List.of(imageOne.getId(), imageTwo.getId()),
                                "videoFiles", List.of(
                                        Map.of("title", "Demo Walkthrough", "videoFileId", videoOne.getId()),
                                        Map.of("title", "Deployment Tour", "videoFileId", videoTwo.getId())
                                )
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.imageFiles.length()").value(2))
                .andExpect(jsonPath("$.data.videoFiles.length()").value(2))
                .andExpect(jsonPath("$.data.videoFiles[0].title").value("Demo Walkthrough"))
                .andExpect(jsonPath("$.data.videoFiles[1].title").value("Deployment Tour"));
    }

    private StoredFile buildFile(String originalFileName, String contentType, FileType fileType) {
        StoredFile storedFile = new StoredFile();
        storedFile.setOriginalFileName(originalFileName);
        storedFile.setStoredFileName(originalFileName);
        storedFile.setContentType(contentType);
        storedFile.setSize(1024);
        storedFile.setFileType(fileType);
        storedFile.setStoragePath(originalFileName);
        return storedFile;
    }
}
