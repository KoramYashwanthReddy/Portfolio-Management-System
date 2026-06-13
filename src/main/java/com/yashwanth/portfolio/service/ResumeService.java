package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.response.ResumeResponse;
import com.yashwanth.portfolio.entity.StoredFile;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface ResumeService {
    ResumeResponse upload(MultipartFile file, String versionLabel);

    ResumeResponse getCurrent();

    List<ResumeResponse> getAll();

    ResumeResponse activate(Long id);

    StoredFile download();
}
