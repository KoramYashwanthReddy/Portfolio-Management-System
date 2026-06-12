import { apiRequest, API_BASE } from "./base-api.js";

export const resumeApi = {
    publicMetadata() {
        return apiRequest("/public/resume");
    },
    adminMetadata() {
        return apiRequest("/admin/resume", { auth: true });
    },
    upload(file, versionLabel = "latest") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("versionLabel", versionLabel);
        return apiRequest("/admin/resume", { method: "POST", formData, auth: true });
    },
    downloadUrl() {
        return `${API_BASE}/public/resume/download`;
    }
};
