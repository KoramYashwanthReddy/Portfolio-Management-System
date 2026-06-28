package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.config.FileStorageProperties;
import com.yashwanth.portfolio.entity.FileType;
import com.yashwanth.portfolio.entity.StoredFile;
import com.yashwanth.portfolio.exception.FileStorageException;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.repository.StoredFileRepository;
import com.yashwanth.portfolio.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class FileStorageServiceImpl implements FileStorageService {

    private final FileStorageProperties properties;
    private final StoredFileRepository storedFileRepository;
    private Path uploadPath;

    @PostConstruct
    void init() {
        try {
            uploadPath = Paths.get(properties.uploadDir()).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
        } catch (IOException exception) {
            throw new FileStorageException("Could not initialize storage", exception);
        }
    }

    @Override
    @Transactional
    public StoredFile store(MultipartFile file, FileType fileType) {
        validate(file, fileType);
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = originalFileName.contains(".") ? originalFileName.substring(originalFileName.lastIndexOf('.')) : "";
        String storedFileName = UUID.randomUUID() + extension;
        Path target = uploadPath.resolve(storedFileName);
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new FileStorageException("Failed to store file", exception);
        }

        StoredFile storedFile = new StoredFile();
        storedFile.setOriginalFileName(originalFileName);
        storedFile.setStoredFileName(storedFileName);
        storedFile.setContentType(file.getContentType());
        storedFile.setSize(file.getSize());
        storedFile.setFileType(fileType);
        storedFile.setStoragePath(target.toString());
        return storedFileRepository.save(storedFile);
    }

    @Override
    public Resource loadAsResource(StoredFile storedFile) {
        Path filePath = uploadPath.resolve(storedFile.getStoredFileName());
        Resource resource = new PathResource(filePath);
        if (!resource.exists()) {
            resource = new PathResource(storedFile.getStoragePath());
            if (!resource.exists()) {
                throw new ResourceNotFoundException("Stored file not found on disk");
            }
        }
        return resource;
    }

    @Override
    public StoredFile getById(Long id) {
        return storedFileRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }

    private void validate(MultipartFile file, FileType fileType) {
        if (file.isEmpty()) {
            throw new FileStorageException("Uploaded file is empty");
        }
        if (file.getSize() > properties.maxFileSize()) {
            throw new FileStorageException("File exceeds the maximum allowed size");
        }
        String contentType = file.getContentType();
        List<String> allowedTypes = switch (fileType) {
            case PROJECT_IMAGE -> properties.allowedImageTypes();
            case PROJECT_VIDEO -> properties.allowedVideoTypes();
            default -> properties.allowedDocumentTypes();
        };
        boolean allowedByType = contentType != null && allowedTypes.contains(contentType);
        boolean allowedByExtension = switch (fileType) {
            case PROJECT_IMAGE, PROJECT_VIDEO -> false;
            default -> hasAllowedDocumentExtension(file.getOriginalFilename());
        };
        if (!allowedByType && !allowedByExtension) {
            throw new FileStorageException("Invalid file type: " + contentType);
        }
    }

    private boolean hasAllowedDocumentExtension(String originalFilename) {
        if (originalFilename == null) {
            return false;
        }
        String fileName = originalFilename.toLowerCase();
        return fileName.endsWith(".pdf")
                || fileName.endsWith(".doc")
                || fileName.endsWith(".docx")
                || fileName.endsWith(".txt")
                || fileName.endsWith(".rtf");
    }
}
