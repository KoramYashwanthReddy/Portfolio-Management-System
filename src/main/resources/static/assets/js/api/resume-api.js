import { apiRequest, API_BASE } from "./base-api.js";

export const resumeApi = {
    publicMetadata() {
        return apiRequest("/public/resume");
    },
    adminMetadata() {
        return apiRequest("/admin/resume", { auth: true });
    },
    listAdmin() {
        return apiRequest("/admin/resume/all", { auth: true });
    },
    upload(file, versionLabel = "latest") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("versionLabel", versionLabel);
        return apiRequest("/admin/resume", { method: "POST", formData, auth: true });
    },
    display(id) {
        return apiRequest(`/admin/resume/${id}/display`, { method: "PATCH", auth: true });
    },
    downloadUrl() {
        return `${API_BASE}/public/resume/download`;
    }
};
