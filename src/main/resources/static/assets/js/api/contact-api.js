import { apiRequest } from "./base-api.js";

export const contactApi = {
    submit(payload) {
        return apiRequest("/public/contact", { method: "POST", body: payload });
    },
    list() {
        return apiRequest("/admin/messages", { auth: true });
    },
    listArchived() {
        return apiRequest("/admin/messages/archived", { auth: true });
    },
    listDeleted() {
        return apiRequest("/admin/messages/deleted", { auth: true });
    },
    markRead(id) {
        return apiRequest(`/admin/messages/${id}/read`, { method: "PATCH", auth: true });
    },
    markUnread(id) {
        return apiRequest(`/admin/messages/${id}/unread`, { method: "PATCH", auth: true });
    },
    star(id) {
        return apiRequest(`/admin/messages/${id}/star`, { method: "PATCH", auth: true });
    },
    unstar(id) {
        return apiRequest(`/admin/messages/${id}/unstar`, { method: "PATCH", auth: true });
    },
    archive(id) {
        return apiRequest(`/admin/messages/${id}/archive`, { method: "PATCH", auth: true });
    },
    unarchive(id) {
        return apiRequest(`/admin/messages/${id}/unarchive`, { method: "PATCH", auth: true });
    },
    restore(id) {
        return apiRequest(`/admin/messages/${id}/restore`, { method: "PATCH", auth: true });
    },
    remove(id) {
        return apiRequest(`/admin/messages/${id}`, { method: "DELETE", auth: true });
    },
    purge(id) {
        return apiRequest(`/admin/messages/${id}/purge`, { method: "DELETE", auth: true });
    }
};
