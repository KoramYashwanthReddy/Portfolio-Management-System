import { apiRequest } from "./base-api.js";

export const contactApi = {
    submit(payload) {
        return apiRequest("/public/contact", { method: "POST", body: payload });
    },
    list() {
        return apiRequest("/admin/messages", { auth: true });
    },
    markRead(id) {
        return apiRequest(`/admin/messages/${id}/read`, { method: "PATCH", auth: true });
    },
    remove(id) {
        return apiRequest(`/admin/messages/${id}`, { method: "DELETE", auth: true });
    }
};
