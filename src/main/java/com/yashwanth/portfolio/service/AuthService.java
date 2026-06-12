package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.ChangePasswordRequest;
import com.yashwanth.portfolio.dto.request.ForgotPasswordRequest;
import com.yashwanth.portfolio.dto.request.LoginRequest;
import com.yashwanth.portfolio.dto.request.RefreshTokenRequest;
import com.yashwanth.portfolio.dto.request.ResetPasswordRequest;
import com.yashwanth.portfolio.dto.response.AdminProfileResponse;
import com.yashwanth.portfolio.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request, String ipAddress);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String token);

    void changePassword(ChangePasswordRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);

    AdminProfileResponse currentUser();

    boolean validate(String token);
}
