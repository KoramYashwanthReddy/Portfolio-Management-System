export const API_BASE = "/api/v1";

const STORAGE_KEY = "pms-auth";
let refreshPromise = null;

export const authStore = {
    get() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    },
    set(session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },
    accessToken() {
        return this.get().accessToken;
    },
    refreshToken() {
        return this.get().refreshToken;
    }
};

function normalizeError(response, payload) {
    const message = payload?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = payload?.errors || null;
    return error;
}

async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }
    return response.blob();
}

async function refreshSession() {
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = authStore.refreshToken();
    if (!refreshToken) {
        throw new Error("Session expired");
    }

    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    }).then(async (response) => {
        const payload = await parseResponse(response);
        if (!response.ok || !payload.success) {
            authStore.clear();
            throw normalizeError(response, payload);
        }

        const current = authStore.get();
        authStore.set({ ...current, ...payload.data });
        return payload.data;
    }).finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export async function apiRequest(path, options = {}) {
    const {
        method = "GET",
        body,
        formData,
        auth = false,
        headers = {},
        retry = true
    } = options;

    const finalHeaders = new Headers(headers);
    let finalBody = body;

    if (auth && authStore.accessToken()) {
        finalHeaders.set("Authorization", `Bearer ${authStore.accessToken()}`);
    }

    if (body && !formData) {
        finalHeaders.set("Content-Type", "application/json");
        finalBody = JSON.stringify(body);
    }

    if (formData) {
        finalBody = formData;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: finalHeaders,
        body: finalBody
    });

    const payload = await parseResponse(response);

    if (response.status === 401 && auth && retry) {
        await refreshSession();
        return apiRequest(path, { ...options, retry: false });
    }

    if (!response.ok || (payload?.success === false)) {
        throw normalizeError(response, payload);
    }

    return payload;
}

export function redirectToLogin() {
    window.location.href = "/api/v1/admin/login.html";
}

export function ensureAuthenticated() {
    if (!authStore.accessToken()) {
        redirectToLogin();
        return false;
    }
    return true;
}
