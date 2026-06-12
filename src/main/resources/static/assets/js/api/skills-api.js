import { apiRequest } from "./base-api.js";

export const skillsApi = {
    list(category = "") {
        const query = category ? `?category=${category}` : "";
        return apiRequest(`/public/skills${query}`);
    },
    listAdmin(category = "") {
        const query = category ? `?category=${category}` : "";
        return apiRequest(`/admin/skills${query}`, { auth: true });
    },
    create(payload) {
        return apiRequest("/admin/skills", { method: "POST", body: payload, auth: true });
    },
    update(id, payload) {
        return apiRequest(`/admin/skills/${id}`, { method: "PUT", body: payload, auth: true });
    },
    remove(id) {
        return apiRequest(`/admin/skills/${id}`, { method: "DELETE", auth: true });
    }
};
