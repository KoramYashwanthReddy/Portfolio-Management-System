package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.entity.FileType;
import com.yashwanth.portfolio.entity.StoredFile;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    StoredFile store(MultipartFile file, FileType fileType);

    Resource loadAsResource(StoredFile storedFile);

    StoredFile getById(Long id);
}
