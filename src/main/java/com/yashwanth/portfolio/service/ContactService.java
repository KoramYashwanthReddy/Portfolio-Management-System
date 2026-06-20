package com.yashwanth.portfolio.service;

import com.yashwanth.portfolio.dto.request.ContactMessageRequest;
import com.yashwanth.portfolio.dto.response.ContactMessageResponse;
import java.util.List;

public interface ContactService {
    ContactMessageResponse submit(ContactMessageRequest request);

    List<ContactMessageResponse> getAll();

    List<ContactMessageResponse> getArchived();

    List<ContactMessageResponse> getDeleted();

    ContactMessageResponse markAsRead(Long id);

    ContactMessageResponse markAsUnread(Long id);

    ContactMessageResponse star(Long id);

    ContactMessageResponse unstar(Long id);

    ContactMessageResponse archive(Long id);

    ContactMessageResponse unarchive(Long id);

    ContactMessageResponse restore(Long id);

    void delete(Long id);

    void purge(Long id);
}
