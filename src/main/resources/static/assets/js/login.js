import { authApi } from "./api/auth-api.js";
import { authStore } from "./api/base-api.js";
import { initTheme } from "./theme.js";

function setStatus(message, type = "") {
    const status = document.getElementById("login-status");
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
}

initTheme();

if (authStore.accessToken()) {
    authStore.clear();
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("login-submit");
    submit.disabled = true;
    setStatus("Authenticating...");

    try {
        const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
        const response = await authApi.login(payload);
        authStore.set(response.data);
        setStatus("Login successful. Redirecting...", "success");
        window.location.href = "/api/v1/admin/dashboard.html";
    } catch (error) {
        setStatus(error.message, "error");
    } finally {
        submit.disabled = false;
    }
});
