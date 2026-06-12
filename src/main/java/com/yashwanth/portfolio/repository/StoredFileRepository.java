package com.yashwanth.portfolio.repository;

import com.yashwanth.portfolio.entity.StoredFile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    Optional<StoredFile> findByIdAndDeletedFalse(Long id);
}
