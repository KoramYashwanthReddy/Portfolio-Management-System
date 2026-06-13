package com.yashwanth.portfolio.service.impl;

import com.yashwanth.portfolio.dto.request.ContactMessageRequest;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import com.yashwanth.portfolio.entity.ContactMessage;
import com.yashwanth.portfolio.exception.ResourceNotFoundException;
import com.yashwanth.portfolio.mapper.PortfolioMapper;
import com.yashwanth.portfolio.mail.MailService;
import com.yashwanth.portfolio.repository.ContactMessageRepository;
import com.yashwanth.portfolio.service.ContactService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {

    private final ContactMessageRepository contactMessageRepository;
    private final MailService mailService;

    @Override
    @Transactional
    public ContactMessageResponse submit(ContactMessageRequest request) {
        ContactMessage message = new ContactMessage();
        message.setName(request.name());
        message.setEmail(request.email());
        message.setSubject(request.subject());
        message.setMessage(request.message());
        message.setReadStatus(false);
        ContactMessage saved = contactMessageRepository.save(message);
        String notificationBody = String.format(
                "New message from the welcome page.\n\nName: %s\nEmail: %s\nSubject: %s\n\nMessage:\n%s",
                request.name(),
                request.email(),
                request.subject(),
                request.message()
        );
        mailService.sendContactNotification("New portfolio message: " + request.subject(), notificationBody);
        mailService.sendAutoReply(request.email(), "Thank you for contacting me", "Your message has been received.");
        return PortfolioMapper.toContactMessage(saved);
    }

    @Override
    public List<ContactMessageResponse> getAll() {
        return contactMessageRepository.findByDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(PortfolioMapper::toContactMessage)
                .toList();
    }

    @Override
    @Transactional
    public ContactMessageResponse markAsRead(Long id) {
        ContactMessage message = getEntity(id);
        message.setReadStatus(true);
        return PortfolioMapper.toContactMessage(contactMessageRepository.save(message));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ContactMessage message = getEntity(id);
        message.setDeleted(true);
        contactMessageRepository.save(message);
    }

    private ContactMessage getEntity(Long id) {
        return contactMessageRepository.findById(id)
                .filter(message -> !message.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
    }
}
