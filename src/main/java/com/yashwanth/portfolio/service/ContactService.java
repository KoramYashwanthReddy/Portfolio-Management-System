package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.ContactMessageRequest;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import java.util.List;

public interface ContactService {
    ContactMessageResponse submit(ContactMessageRequest request);

    List<ContactMessageResponse> getAll();

    ContactMessageResponse markAsRead(Long id);

    void delete(Long id);
}
