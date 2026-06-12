import { apiRequest } from "./base-api.js";

export const filesApi = {
    upload(file, fileType) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", fileType);
        return apiRequest("/admin/files", { method: "POST", formData, auth: true });
    }
};
