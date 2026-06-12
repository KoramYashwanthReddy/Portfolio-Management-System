package com.yashwanth.portfolio.mail;

public interface MailService {
    void sendContactNotification(String subject, String body);

    void sendAutoReply(String email, String subject, String body);

    void sendPasswordResetMail(String email, String body);

    void sendFailedLoginAlert(String email, String attemptedIdentifier, String ipAddress, String timestamp);
}
