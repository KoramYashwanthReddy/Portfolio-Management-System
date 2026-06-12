package com.yashwanth.portfolio.utils;

import com.yashwanth.portfolio.dto.response.PageResponse;
import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

public final class PageMapper {

    private PageMapper() {
    }

    public static <T, R> PageResponse<R> map(Page<T> page, Function<T, R> mapper) {
        List<R> content = page.getContent().stream().map(mapper).toList();
        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }
}
