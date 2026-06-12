package com.yashwanth.portfolio.controller.publicapi;

import com.yashwanth.portfolio.constants.AppConstants;
import com.yashwanth.portfolio.dto.request.ChangePasswordRequest;
import com.yashwanth.portfolio.dto.request.ForgotPasswordRequest;
import com.yashwanth.portfolio.dto.request.LoginRequest;
import com.yashwanth.portfolio.dto.request.RefreshTokenRequest;
import com.yashwanth.portfolio.dto.request.ResetPasswordRequest;
import com.yashwanth.portfolio.dto.response.ApiResponse;
import com.yashwanth.portfolio.dto.response.AuthResponse;
import com.yashwanth.portfolio.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request,
                                                           HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                "Login successful",
                authService.login(request, resolveClientIp(httpServletRequest))
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", authService.refreshToken(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset instructions generated", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader(AppConstants.AUTH_HEADER) String authorizationHeader) {
        authService.logout(authorizationHeader.replace(AppConstants.BEARER_PREFIX, ""));
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @PostMapping("/change-password")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully", null));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<?>> me() {
        return ResponseEntity.ok(ApiResponse.success("Current user profile", authService.currentUser()));
    }

    @GetMapping("/validate")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Boolean>> validate(@RequestHeader(AppConstants.AUTH_HEADER) String authorizationHeader) {
        boolean valid = authService.validate(authorizationHeader.replace(AppConstants.BEARER_PREFIX, ""));
        return ResponseEntity.ok(ApiResponse.success("Token validation completed", valid));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
