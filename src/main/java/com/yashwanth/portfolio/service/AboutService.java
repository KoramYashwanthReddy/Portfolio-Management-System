package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.AboutRequest;
import com.yashwanth.portfolio.dto.response.AboutResponse;

public interface AboutService {
    AboutResponse upsert(AboutRequest request);

    AboutResponse get();
}
