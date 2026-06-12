import { apiRequest } from "./base-api.js";

export const aboutApi = {
    getPublic() {
        return apiRequest("/public/about");
    },
    getAdmin() {
        return apiRequest("/admin/about", { auth: true });
    },
    update(payload) {
        return apiRequest("/admin/about", { method: "PUT", body: payload, auth: true });
    }
};
