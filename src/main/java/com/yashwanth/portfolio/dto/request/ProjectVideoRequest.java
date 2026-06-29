package com.yashwanth.portfolio.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProjectVideoRequest(
        @NotBlank @Size(max = 150) String title,
        @NotNull Long videoFileId
) {
}
