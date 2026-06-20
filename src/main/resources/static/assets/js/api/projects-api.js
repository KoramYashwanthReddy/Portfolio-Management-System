import { apiRequest } from "./base-api.js";

function makeQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            search.set(key, value);
        }
    });
    const query = search.toString();
    return query ? `?${query}` : "";
}

export const projectsApi = {
    getPublic(params) {
        return apiRequest(`/public/projects${makeQuery(params)}`);
    },
    featured() {
        return apiRequest("/public/projects/featured");
    },
    getAdmin(params) {
        return apiRequest(`/admin/projects${makeQuery(params)}`, { auth: true });
    },
    getAdminById(id) {
        return apiRequest(`/admin/projects/${id}`, { auth: true });
    },
    create(payload) {
        return apiRequest("/admin/projects", { method: "POST", body: payload, auth: true });
    },
    update(id, payload) {
        return apiRequest(`/admin/projects/${id}`, { method: "PUT", body: payload, auth: true });
    },
    remove(id) {
        return apiRequest(`/admin/projects/${id}`, { method: "DELETE", auth: true });
    },
    notes(projectId, params = {}) {
        return apiRequest(`/admin/projects/${projectId}/notes${makeQuery(params)}`, { auth: true });
    },
    createNote(projectId, payload) {
        return apiRequest(`/admin/projects/${projectId}/notes`, { method: "POST", body: payload, auth: true });
    },
    updateNote(projectId, noteId, payload) {
        return apiRequest(`/admin/projects/${projectId}/notes/${noteId}`, { method: "PUT", body: payload, auth: true });
    },
    removeNote(projectId, noteId) {
        return apiRequest(`/admin/projects/${projectId}/notes/${noteId}`, { method: "DELETE", auth: true });
    }
};
