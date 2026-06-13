package com.yashwanth.portfolio.mail;

import com.yashwanth.portfolio.config.AdminProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private final JavaMailSender mailSender;
    private final AdminProperties adminProperties;

    @Override
    public void sendContactNotification(String subject, String body) {
        send(adminProperties.email(), subject, body);
    }

    @Override
    public void sendAutoReply(String email, String subject, String body) {
        send(email, subject, body);
    }

    @Override
    public void sendPasswordResetMail(String email, String body) {
        send(email, "Portfolio password reset", body);
    }

    @Override
    public void sendFailedLoginAlert(String email, String attemptedIdentifier, String ipAddress, String timestamp) {
        String subject = "URGENT: Failed Admin Login Attempt Detected";
        String body = String.format(
            "An unauthorized login attempt was made to your Portfolio Admin panel.\n\n" +
            "Attempted Identifier: %s\n" +
            "IP Address: %s\n" +
            "Time: %s\n\n" +
            "If this was not you, please ensure your credentials are secure.",
            attemptedIdentifier, ipAddress, timestamp
        );
        send(email, subject, body);
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception exception) {
            log.warn("Mail delivery failed for {}: {}", to, exception.getMessage());
            log.info("Mail fallback content for {} | subject='{}' | body='{}'", to, subject, body);
        }
    }
}
