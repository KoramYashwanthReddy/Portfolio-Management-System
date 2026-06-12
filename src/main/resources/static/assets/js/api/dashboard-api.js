import { apiRequest } from "./base-api.js";

export const dashboardApi = {
    getPublic() {
        return apiRequest("/public/dashboard");
    }
};
