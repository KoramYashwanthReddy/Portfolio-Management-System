import { apiRequest } from "./base-api.js";

export const dashboardApi = {
    get() {
        return apiRequest("/admin/dashboard", { auth: true });
    },
    getPublic() {
        return apiRequest("/public/dashboard");
    }
};
