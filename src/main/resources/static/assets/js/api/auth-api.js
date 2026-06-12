import { apiRequest, authStore } from "./base-api.js";

export const authApi = {
    login(payload) {
        return apiRequest("/auth/login", { method: "POST", body: payload });
    },
    validate() {
        return apiRequest("/auth/validate", { auth: true });
    },
    me() {
        return apiRequest("/auth/me", { auth: true });
    },
    changePassword(payload) {
        return apiRequest("/auth/change-password", { method: "POST", body: payload, auth: true });
    },
    forgotPassword(payload) {
        return apiRequest("/auth/forgot-password", { method: "POST", body: payload });
    },
    resetPassword(payload) {
        return apiRequest("/auth/reset-password", { method: "POST", body: payload });
    },
    async logout() {
        try {
            await apiRequest("/auth/logout", { method: "POST", auth: true });
        } finally {
            authStore.clear();
        }
    }
};
