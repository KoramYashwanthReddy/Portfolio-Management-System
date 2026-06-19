import { authApi } from "./api/auth-api.js";
import { authStore } from "./api/base-api.js";
import { initTheme } from "./theme.js";

// Apply theme
initTheme();

// ─── Always show the login form, never auto-redirect ───────────────────────
// Clear any stale token so the user must always authenticate manually
authStore.clear();

// ─── Status renderer ───────────────────────────────────────────────────────
function setStatus(message, type = "") {
    // Use the new rich styled renderer on the premium login page
    if (typeof window.__loginStatusOverride === "function") {
        window.__loginStatusOverride(message, type);
        return;
    }
    // Fallback for any plain page
    const status = document.getElementById("login-status");
    if (!status) return;
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
}

// ─── Form submission ───────────────────────────────────────────────────────
const form = document.getElementById("login-form");
if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = document.getElementById("login-submit");
        if (submit) submit.disabled = true;
        setStatus("Authenticating...", "");

        try {
            const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
            const response = await authApi.login(payload);
            authStore.set(response.data);
            setStatus("Login successful. Redirecting to dashboard...", "success");
            // Short delay so the user sees the success state before redirect
            setTimeout(() => {
                window.location.href = "/api/v1/admin/dashboard.html";
            }, 900);
        } catch (error) {
            setStatus(error.message || "Invalid credentials. Please try again.", "error");
            if (submit) submit.disabled = false;
        }
    });
}
