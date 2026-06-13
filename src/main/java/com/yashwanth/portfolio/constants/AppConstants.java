package com.yashwanth.portfolio.constants;

import java.util.List;

public final class AppConstants {

    public static final String API_VERSION = "v1";
    public static final String ADMIN_ROLE = "ADMIN";
    public static final String AUTH_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final List<String> PUBLIC_ENDPOINTS = List.of(
            "/",
            "/index.html",
            "/portfolio.html",
            "/feedback.html",
            "/assets/**",
            "/admin/*.html",
            "/auth/login",
            "/auth/refresh",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/public/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**"
    );

    private AppConstants() {
    }
}
