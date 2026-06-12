package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.response.ResumeResponse;
import com.yashwanth.portfolio.entity.StoredFile;
import org.springframework.web.multipart.MultipartFile;

public interface ResumeService {
    ResumeResponse upload(MultipartFile file, String versionLabel);

    ResumeResponse getCurrent();

    StoredFile download();
}
