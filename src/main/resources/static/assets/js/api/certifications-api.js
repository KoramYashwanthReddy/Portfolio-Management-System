import { apiRequest } from "./base-api.js";

export const certificationsApi = {
    list() {
        return apiRequest("/public/certifications");
    },
    listAdmin() {
        return apiRequest("/admin/certifications", { auth: true });
    },
    create(payload) {
        return apiRequest("/admin/certifications", { method: "POST", body: payload, auth: true });
    },
    update(id, payload) {
        return apiRequest(`/admin/certifications/${id}`, { method: "PUT", body: payload, auth: true });
    },
    remove(id) {
        return apiRequest(`/admin/certifications/${id}`, { method: "DELETE", auth: true });
    }
};
