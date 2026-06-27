import { ensureAuthenticated, redirectToLogin } from "./api/base-api.js";
import { authApi } from "./api/auth-api.js";
import { dashboardApi } from "./api/dashboard-api.js";
import { projectsApi } from "./api/projects-api.js";
import { skillsApi } from "./api/skills-api.js";
import { certificationsApi } from "./api/certifications-api.js";
import { contactApi } from "./api/contact-api.js";
import { aboutApi } from "./api/about-api.js";
import { resumeApi } from "./api/resume-api.js";
import { filesApi } from "./api/files-api.js";
import { initTheme } from "./theme.js";

const PROJECT_CATEGORIES = ["WEB", "MOBILE", "BACKEND", "FULL_STACK", "DEVOPS", "DATA", "OTHER"];
const PROJECT_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"];
const SKILL_CATEGORIES = ["LANGUAGE", "FRAMEWORK", "DATABASE", "CLOUD", "DEVOPS", "TOOL", "SOFT_SKILL", "OTHER"];

const page = document.body.dataset.page;
const state = {
    projectPage: 0,
    projectSize: 8,
    projectViewMode: "grid",
    projectYearFilter: "",
    projectsCache: [],
    starredProjects: readStoredArray("starred_projects"),
    comparedProjects: readStoredArray("compared_projects"),
    editingProjectId: null,
    editingProjectNoteId: null,
    editingSkillId: null,
    editingCertificationId: null,
    currentProject: null,
    currentProjectNotes: [],
    projectDeleteTarget: null,
    currentCertification: null,
    skillsCache: [],
    certificationsCache: [],
    aboutSnapshot: null,
    resumeSnapshot: null,
    messagesCache: [],
    archivedMessagesCache: [],
    deletedMessagesCache: [],
    messageQueue: "inbox",
    messageSearch: "",
    messageStatus: "",
    notesSearch: "",
    notesPinnedOnly: false
};

const PROJECT_NOTE_TYPES = ["FEATURE_USED", "TECHNOLOGY_USED", "IMPLEMENTATION_DECISION", "MILESTONE", "REMINDER", "REFERENCE", "PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED"];
const PROJECT_NOTE_PAGE_TYPES = ["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED"];

function markupOptions(values, includeAll = false) {
    const source = includeAll ? ["", ...values] : values;
    return source.map((value) => `<option value="${value}">${value ? value.replaceAll("_", " ") : "All"}</option>`).join("");
}

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures so the admin shell still renders.
    }
}

function createSidebar() {
    const sidebar = document.querySelector(".admin-sidebar");
    if (!sidebar) {
        return;
    }
    const links = [
        ["dashboard", "Dashboard", "fa-solid fa-chart-pie"],
        ["projects", "Projects", "fa-solid fa-briefcase"],
        ["skills", "Skills", "fa-solid fa-bolt"],
        ["certifications", "Certifications", "fa-solid fa-certificate"],
        ["messages", "Messages", "fa-solid fa-envelope"],
        ["profile", "Profile", "fa-solid fa-user"],
        ["resume", "Resume", "fa-solid fa-file-pdf"]
    ];
    const collapsed = safeStorageGet("pms-admin-sidebar") === "collapsed";
    sidebar.classList.toggle("is-collapsed", collapsed);
    document.body.dataset.adminSidebar = collapsed ? "collapsed" : "expanded";
    sidebar.innerHTML = `
        <div class="admin-sidebar-shell">
            <div class="admin-sidebar-brand-row">
                <a class="admin-sidebar-brand" href="/api/v1/admin/dashboard.html">
                    <span class="logo-circle">P</span>
                    <div class="admin-brand-copy">
                        <p class="eyebrow">Control Plane</p>
                        <h2>PMS Console</h2>
                    </div>
                </a>
                <button class="admin-sidebar-toggle" data-sidebar-toggle type="button" aria-label="Collapse sidebar" title="Collapse sidebar">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
            </div>
            <div class="admin-sidebar-section-label">Navigation</div>
            <nav class="admin-sidebar-nav" aria-label="Admin navigation">
                ${links.map(([slug, label, icon]) => `
                    <a class="admin-nav-link ${slug === page ? "active" : ""}" href="/api/v1/admin/${slug}.html">
                        <span class="sidebar-link-icon"><i class="${icon}"></i></span>
                        <span class="admin-nav-label">${label}</span>
                    </a>
                `).join("")}
            </nav>
            <div class="admin-sidebar-section-label">Workspace</div>
            <div class="admin-sidebar-actions">
                <button class="theme-toggle" aria-label="Toggle theme">
                    <i class="fa-solid fa-moon"></i>
                    <span>Theme</span>
                </button>
                <a class="admin-nav-cta" href="/api/v1/portfolio.html">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>View Site</span>
                </a>
                <button class="admin-logout-btn" data-logout aria-label="Sign out">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    `;

    const toggle = sidebar.querySelector("[data-sidebar-toggle]");
    const syncSidebarState = () => {
        const isCollapsed = sidebar.classList.contains("is-collapsed");
        document.body.dataset.adminSidebar = isCollapsed ? "collapsed" : "expanded";
        safeStorageSet("pms-admin-sidebar", isCollapsed ? "collapsed" : "expanded");
        if (toggle) {
            toggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
            toggle.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
            toggle.innerHTML = `<i class="fa-solid fa-angles-${isCollapsed ? "right" : "left"}"></i>`;
        }
    };

    syncSidebarState();
    toggle?.addEventListener("click", () => {
        sidebar.classList.toggle("is-collapsed");
        syncSidebarState();
    });
}

function setFormStatus(form, message, type = "") {
    let status = form.querySelector(".form-status");
    if (!status) {
        status = document.createElement("p");
        status.className = "form-status";
        form.append(status);
    }
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
}

function emptyMarkup(message) {
    return `<div class="empty-state">${message}</div>`;
}

function normalizeValue(value) {
    return String(value ?? "").trim();
}

function normalizeKey(value) {
    return normalizeValue(value).toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatEnumLabel(value) {
    return String(value ?? "")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatTimestamp(value, includeDate = true) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    return includeDate
        ? date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function parseTags(tags) {
    if (!tags) {
        return [];
    }
    if (Array.isArray(tags)) {
        return tags;
    }
    return String(tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function isDisplayedValue(value) {
    return value !== false && value !== "false" && value !== 0 && value !== "0";
}

function confirmDanger(message) {
    return window.confirm(message);
}

function buildProjectPayload(project, overrides = {}) {
    return {
        title: project?.title ?? "",
        shortDescription: project?.shortDescription ?? "",
        detailedDescription: project?.detailedDescription ?? "",
        technologies: project?.technologies ?? "",
        githubUrl: project?.githubUrl ?? "",
        liveUrl: project?.liveUrl ?? "",
        imageUrl: project?.imageUrl ?? "",
        category: project?.category ?? "OTHER",
        status: project?.status ?? "PLANNED",
        featured: Boolean(project?.featured),
        displayed: project?.displayed !== false,
        completionDate: project?.completionDate || null,
        imageFileId: project?.imageFile?.id ?? null,
        ...overrides
    };
}

async function copyTextToClipboard(text) {
    const value = String(text || "").trim();
    if (!value) {
        return false;
    }
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    }
}

function formatBytes(size) {
    if (!size && size !== 0) {
        return "";
    }
    if (size < 1024) {
        return `${size} B`;
    }
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedDocument(file) {
    if (!file) {
        return false;
    }
    const allowedTypes = new Set([
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/rtf"
    ]);
    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".rtf"];
    const fileName = (file.name || "").toLowerCase();
    return allowedTypes.has(file.type) || allowedExtensions.some((extension) => fileName.endsWith(extension));
}

async function protect() {
    if (!ensureAuthenticated()) {
        return false;
    }
    try {
        await authApi.validate();
        return true;
    } catch {
        redirectToLogin();
        return false;
    }
}

function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((button) => {
        button.addEventListener("click", async () => {
            await authApi.logout();
            redirectToLogin();
        });
    });
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function extractPagedItems(value) {
    if (Array.isArray(value)) {
        return value;
    }
    return safeArray(value?.content);
}

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function formatRelativeTime(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.round(diff / 60000));
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

function formatDateRange(start, end) {
    if (!start || !end) {
        return "Last 30 days";
    }
    return `${start.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function getInitials(name = "") {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!parts.length) {
        return "P";
    }
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function formatDashboardDate(value) {
    if (!value) {
        return "-";
    }
    const date = new Date(value);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function readStoredArray(key) {
    try {
        const raw = safeStorageGet(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
    } catch {
        return [];
    }
}

function writeStoredArray(key, value) {
    safeStorageSet(key, JSON.stringify(safeArray(value).map((item) => String(item))));
}

function splitTechnologiesList(technologies) {
    return parseTags(technologies);
}

function getProjectYear(project) {
    const source = project?.completionDate || project?.createdAt || "";
    if (!source) {
        return "";
    }
    const year = new Date(source).getFullYear();
    return Number.isNaN(year) ? "" : String(year);
}

function formatProjectStatus(status) {
    return status ? formatEnumLabel(status) : "Unknown";
}

function formatProjectStatusTone(project) {
    switch (project.status) {
        case "COMPLETED":
            return "completed";
        case "IN_PROGRESS":
            return "progress";
        case "PLANNED":
            return "planned";
        case "ARCHIVED":
            return "archived";
        default:
            return "default";
    }
}

function getProjectProgressMeta(project) {
    switch (project?.status) {
        case "COMPLETED":
            return {
                label: "Completed",
                detail: "Ready to ship",
                iconClass: "fa-solid fa-circle-check",
                spinIcon: false,
                percent: 100,
                stateClass: "is-completed"
            };
        case "IN_PROGRESS":
            return {
                label: "In progress",
                detail: "Loading build",
                iconClass: "fa-solid fa-spinner",
                spinIcon: true,
                percent: 68,
                stateClass: "is-progress"
            };
        case "ARCHIVED":
            return {
                label: "Archived",
                detail: "Stored away",
                iconClass: "fa-solid fa-box-archive",
                spinIcon: false,
                percent: 100,
                stateClass: "is-archived"
            };
        case "PLANNED":
        default:
            return {
                label: "Planned",
                detail: "Queued next",
                iconClass: "fa-regular fa-calendar-check",
                spinIcon: false,
                percent: 18,
                stateClass: "is-planned"
            };
    }
}

function getProjectCardStatusMeta(project) {
    switch (project?.status) {
        case "COMPLETED":
            return {
                label: "Completed",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.1)",
                border: "rgba(16, 185, 129, 0.2)",
                dot: "#10b981"
            };
        case "ARCHIVED":
            return {
                label: "Archived",
                color: "#64748b",
                background: "rgba(148, 163, 184, 0.14)",
                border: "rgba(148, 163, 184, 0.22)",
                dot: "#94a3b8"
            };
        case "PLANNED":
            return {
                label: "Planned",
                color: "#b45309",
                background: "rgba(245, 158, 11, 0.12)",
                border: "rgba(245, 158, 11, 0.2)",
                dot: "#f59e0b"
            };
        case "IN_PROGRESS":
        default:
            return {
                label: "In development",
                color: "#8b5cf6",
                background: "rgba(139, 92, 246, 0.1)",
                border: "rgba(139, 92, 246, 0.2)",
                dot: "#8b5cf6"
            };
    }
}

function isStarredProject(projectId) {
    return state.starredProjects.includes(String(projectId));
}

function isComparedProject(projectId) {
    return state.comparedProjects.includes(String(projectId));
}

function syncProjectCardToggle(button, active, activeLabel, inactiveLabel) {
    if (!button) {
        return;
    }
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.title = active ? activeLabel : inactiveLabel;
    button.setAttribute("aria-label", active ? activeLabel : inactiveLabel);
}

function animateProjectToggle(button, active) {
    if (!button) {
        return;
    }
    button.classList.remove("is-animating", "is-toggling-on", "is-toggling-off");
    void button.offsetWidth;
    button.classList.add("is-animating", active ? "is-toggling-on" : "is-toggling-off");
    window.setTimeout(() => {
        button.classList.remove("is-animating", "is-toggling-on", "is-toggling-off");
    }, 260);
}

function projectMetricCardMarkup(label, value, subtitle, iconClass, tone = "") {
    return `
        <article class="projects-metric-card ${tone ? `is-${tone}` : ""}">
            <div class="projects-metric-icon"><i class="${iconClass}"></i></div>
            <div class="projects-metric-copy">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(String(value))}</strong>
                <p>${escapeHtml(subtitle)}</p>
            </div>
        </article>
    `;
}

function projectCardMarkup(project, index = 0) {
    const techs = splitTechnologiesList(project.technologies);
    const summary = project.shortDescription || project.detailedDescription || "No summary provided.";
    const statusMeta = getProjectCardStatusMeta(project);
    const starred = isStarredProject(project.id);
    const compared = isComparedProject(project.id);
    const featuredLabel = project.featured ? "Unfeature" : "Mark featured";
    const archiveLabel = project.status === "ARCHIVED" ? "Restore project" : "Archive project";
    const visibilityLabel = project.displayed === false ? "Show in portfolio" : "Hide from portfolio";
    const linkLabel = project.liveUrl ? "Copy live link" : (project.githubUrl ? "Copy GitHub link" : "Copy project link");
    return `
        <article class="table-card admin-project-card ${project.featured ? "is-featured" : ""} ${project.displayed === false ? "is-hidden-project" : ""}" data-project-card="${project.id}">
            <header class="project-card-header-top">
                <div class="project-card-top-pills">
                    <span class="project-number">${String(index + 1).padStart(2, "0")}</span>
                    <span class="project-status-pill" style="background:${statusMeta.background};color:${statusMeta.color};border:1px solid ${statusMeta.border};">
                        <span class="mnc-status-dot" style="background:${statusMeta.dot};"></span>
                        ${escapeHtml(statusMeta.label)}
                    </span>
                    <span class="project-year">${getProjectYear(project) || "-"}</span>
                </div>
                <div class="project-card-top-actions">
                    <button class="project-mini-btn project-star-btn ${starred ? "is-active" : ""}" data-project-star="${project.id}" type="button" title="${starred ? "Unstar project" : "Star project"}" aria-label="${starred ? "Unstar project" : "Star project"}" aria-pressed="${starred}">
                        <i class="fa-solid fa-star"></i>
                    </button>
                    <button class="project-mini-btn project-compare-btn ${compared ? "is-active" : ""}" data-project-compare="${project.id}" type="button" title="${compared ? "Remove from compare" : "Add to compare"}" aria-label="${compared ? "Remove from compare" : "Add to compare"}" aria-pressed="${compared}">
                        <i class="fa-solid fa-code-compare"></i>
                    </button>
                    <div class="project-card-menu-wrap">
                        <button class="project-mini-btn project-menu-button" data-project-menu-open="${project.id}" type="button" aria-label="More options" aria-expanded="false">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="project-card-menu" data-project-card-menu="${project.id}" role="menu" aria-label="Project actions">
                            <button class="project-card-menu-item" data-project-details="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                <span>View details</span>
                            </button>
                            <button class="project-card-menu-item" data-project-edit="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-pen"></i>
                                <span>Edit</span>
                            </button>
                            <button class="project-card-menu-item" data-project-duplicate="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-clone"></i>
                                <span>Duplicate</span>
                            </button>
                            <button class="project-card-menu-item" data-project-toggle-featured="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-star"></i>
                                <span>${escapeHtml(featuredLabel)}</span>
                            </button>
                            <button class="project-card-menu-item" data-project-toggle-archive="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-box-archive"></i>
                                <span>${escapeHtml(archiveLabel)}</span>
                            </button>
                            <button class="project-card-menu-item" data-project-toggle-visibility="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-eye-slash"></i>
                                <span>${escapeHtml(visibilityLabel)}</span>
                            </button>
                            <button class="project-card-menu-item" data-project-copy-link="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-copy"></i>
                                <span>${escapeHtml(linkLabel)}</span>
                            </button>
                            <button class="project-card-menu-item" data-project-notes-open="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-file-lines"></i>
                                <span>Open notes</span>
                            </button>
                            <div class="project-card-menu-divider" role="separator"></div>
                            <button class="project-card-menu-item is-danger" data-project-delete="${project.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-trash"></i>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <div class="project-card-title-block">
                <strong>${escapeHtml(project.title || "Untitled project")}</strong>
                <p class="section-copy">${escapeHtml(summary)}</p>
            </div>
            <div class="project-stack-block">
                <div class="project-stack-header">
                    <span class="project-stack-label">Stacks</span>
                    <span class="project-stack-hint">${escapeHtml(techs.length ? `${techs.length} technologies` : "No stack listed")}</span>
                </div>
                <div class="project-card-tech-list">
                    ${techs.slice(0, 6).map((tech) => `<span class="chip">${escapeHtml(tech)}</span>`).join("") || '<span class="chip">Stack unavailable</span>'}
                </div>
            </div>
            <div class="project-card-footer">
                <div class="project-footer-links">
                    ${project.githubUrl ? `<a class="project-footer-link" href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noreferrer"><i class="fa-brands fa-github"></i> GitHub</a>` : `<span class="project-footer-link is-disabled"><i class="fa-brands fa-github"></i> GitHub</span>`}
                    <button class="project-footer-link project-notes-link" data-project-notes-open="${project.id}" type="button">
                        <i class="fa-solid fa-file-lines"></i>
                        <span>Notes</span>
                    </button>
                </div>
                <button class="project-footer-arrow project-detail-toggle" data-project-view="${project.id}" type="button" aria-label="View project details" title="View project details">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </article>
    `;
}

function projectCompareCardMarkup(project) {
    const technologies = parseTags(project.technologies);
    const progressMeta = getProjectProgressMeta(project);
    const year = getProjectYear(project) || "In progress";
    const rows = [
        { label: "Category", value: project.category || "Project" },
        { label: "Status", value: formatProjectStatus(project.status) },
        { label: "Featured", value: project.featured ? "Yes" : "No" },
        { label: "Displayed", value: project.displayed === false ? "Hidden" : "Visible" },
        { label: "Year", value: year },
        { label: "Stack", value: `${technologies.length} tech${technologies.length === 1 ? "" : "s"}` }
    ];
    return `
        <article class="project-compare-card ${progressMeta.stateClass}">
            <div class="project-compare-card-top">
                <span class="project-number">${getProjectYear(project) || "-"}</span>
                <div class="project-progress-pill ${progressMeta.stateClass}">
                    <div class="project-progress-pill-top">
                        <span class="project-progress-pill-label">
                            <i class="${progressMeta.iconClass}${progressMeta.spinIcon ? " fa-spin" : ""}"></i>
                            <span>${escapeHtml(progressMeta.label)}</span>
                        </span>
                        <span class="project-progress-pill-percent">${progressMeta.percent}%</span>
                    </div>
                    <div class="project-progress-track" aria-hidden="true">
                        <span class="project-progress-fill" style="width: ${progressMeta.percent}%"></span>
                    </div>
                </div>
            </div>
            <div class="project-compare-card-title">
                <h3>${escapeHtml(project.title || "Untitled project")}</h3>
                <p class="section-copy">${escapeHtml(project.shortDescription || "No short description provided.")}</p>
            </div>
            <div class="project-compare-card-grid">
                ${rows.map((row) => `
                    <article class="project-compare-meta">
                        <span>${escapeHtml(row.label)}</span>
                        <strong>${escapeHtml(String(row.value))}</strong>
                    </article>
                `).join("")}
            </div>
            <div class="project-compare-card-body">
                <p>${escapeHtml(project.detailedDescription || "No detailed description provided.")}</p>
            </div>
            <div class="project-stack-block">
                <div class="project-stack-header">
                    <span class="project-stack-label">Stacks</span>
                    <span class="project-stack-hint">${escapeHtml(year)}</span>
                </div>
                <div class="chip-row project-tech-row">
                    ${technologies.slice(0, 8).map((tech) => `<span class="chip">${escapeHtml(tech)}</span>`).join("") || '<span class="chip">Stack unavailable</span>'}
                </div>
            </div>
            <div class="project-compare-card-links">
                ${project.githubUrl ? `<a class="button button-outline" href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                ${project.liveUrl ? `<a class="button button-outline" href="${escapeHtml(project.liveUrl)}" target="_blank" rel="noreferrer">Live site</a>` : ""}
                ${project.notesCount != null ? `<span class="chip">Notes: ${escapeHtml(String(project.notesCount))}</span>` : ""}
            </div>
        </article>
    `;
}

function getComparedProjects() {
    const selectedIds = state.comparedProjects.map(String);
    return state.projectsCache.filter((project) => selectedIds.includes(String(project.id)));
}

function renderProjectCompareTray() {
    const tray = document.getElementById("project-compare-tray");
    if (!tray) {
        return;
    }
    const selected = getComparedProjects();
    if (!selected.length) {
        tray.classList.add("hidden");
        tray.innerHTML = "";
        return;
    }
    tray.classList.remove("hidden");
    tray.innerHTML = `
        <div class="project-compare-tray-copy">
            <span class="eyebrow">Compare selected</span>
            <strong>${selected.length} project${selected.length === 1 ? "" : "s"} selected</strong>
            <p>${selected.map((project) => escapeHtml(project.title || "Untitled project")).join(" &bull; ")}</p>
        </div>
        <div class="project-compare-tray-actions">
            <button id="project-compare-open" class="button button-primary" type="button" ${selected.length < 2 ? "disabled" : ""}>
                <i class="fa-solid fa-code-compare"></i>
                <span>${selected.length < 2 ? "Select one more" : "Compare"}</span>
            </button>
            <button id="project-compare-cancel" class="button button-outline" type="button">
                <i class="fa-solid fa-xmark"></i>
                <span>Cancel</span>
            </button>
        </div>
    `;
}

function renderProjectCompareModal() {
    const content = document.getElementById("project-compare-content");
    if (!content) {
        return;
    }
    const selected = getComparedProjects();
    if (selected.length < 2) {
        content.innerHTML = emptyMarkup("Select at least two projects to compare.");
        return;
    }
    content.innerHTML = `
        <div class="project-compare-grid">
            ${selected.map((project) => projectCompareCardMarkup(project)).join("")}
        </div>
    `;
}

function openProjectCompareModal() {
    const modal = document.getElementById("project-compare-modal");
    if (!modal) {
        return;
    }
    renderProjectCompareModal();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeProjectCompareModal() {
    const modal = document.getElementById("project-compare-modal");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function getProjectDeleteRequirements(project) {
    return {
        title: normalizeValue(project?.title || ""),
        token: "DELETE"
    };
}

function syncProjectDeleteModal() {
    const modal = document.getElementById("project-delete-modal");
    const form = document.getElementById("project-delete-form");
    const submit = document.getElementById("project-delete-submit");
    const titleInput = document.getElementById("project-delete-title-input");
    const tokenInput = document.getElementById("project-delete-token-input");
    const project = state.projectDeleteTarget;
    if (!modal || !form || !submit || !titleInput || !tokenInput || !project) {
        return;
    }
    const requirements = getProjectDeleteRequirements(project);
    const titleMatches = normalizeValue(titleInput.value) === requirements.title;
    const tokenMatches = normalizeValue(tokenInput.value).toUpperCase() === requirements.token;
    submit.disabled = !(titleMatches && tokenMatches);
    form.dataset.ready = String(titleMatches && tokenMatches);
}

function openProjectDeleteModal(project) {
    const modal = document.getElementById("project-delete-modal");
    const titleNode = document.getElementById("project-delete-title");
    const nameNode = document.getElementById("project-delete-project-name");
    const titleInput = document.getElementById("project-delete-title-input");
    const tokenInput = document.getElementById("project-delete-token-input");
    const submit = document.getElementById("project-delete-submit");
    if (!modal || !titleNode || !nameNode || !titleInput || !tokenInput || !submit) {
        return;
    }
    state.projectDeleteTarget = project;
    const requirements = getProjectDeleteRequirements(project);
    titleNode.textContent = `Delete ${project?.title || "project"}`;
    nameNode.textContent = requirements.title || "Untitled project";
    titleInput.value = "";
    tokenInput.value = "";
    submit.disabled = true;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    syncProjectDeleteModal();
    window.setTimeout(() => titleInput.focus(), 0);
}

function closeProjectDeleteModal() {
    const modal = document.getElementById("project-delete-modal");
    const form = document.getElementById("project-delete-form");
    const submit = document.getElementById("project-delete-submit");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.projectDeleteTarget = null;
    form?.reset();
    if (submit) {
        submit.disabled = true;
    }
}

async function handleProjectDelete(project) {
    openProjectDeleteModal(project);
}

async function applyProjectUpdate(project, overrides = {}) {
    await projectsApi.update(project.id, buildProjectPayload(project, overrides));
    state.projectPage = 0;
    await loadProjectsAdmin();
}

async function duplicateProject(project) {
    const copyPayload = buildProjectPayload(project, {
        title: `Copy of ${project.title || "Untitled project"}`,
        featured: false,
        displayed: true,
        status: "PLANNED",
        completionDate: null
    });
    await projectsApi.create(copyPayload);
    state.projectPage = 0;
    await loadProjectsAdmin();
}

async function toggleProjectFeatured(project) {
    await applyProjectUpdate(project, { featured: !project.featured });
}

async function toggleProjectArchive(project) {
    const nextStatus = project.status === "ARCHIVED" ? "PLANNED" : "ARCHIVED";
    await applyProjectUpdate(project, { status: nextStatus });
}

async function toggleProjectVisibility(project) {
    await applyProjectUpdate(project, { displayed: project.displayed === false });
}

async function openProjectLink(project) {
    const url = project.liveUrl || project.githubUrl || "";
    if (!url) {
        alert("This project does not have a public link yet.");
        return;
    }
    const copied = await copyTextToClipboard(url);
    alert(copied ? "Project link copied to clipboard." : "Could not copy the link automatically.");
}

function closeProjectMenus(exceptButton = null) {
    document.querySelectorAll("[data-project-menu-open]").forEach((button) => {
        if (button !== exceptButton) {
            button.closest(".project-card-menu-wrap")?.classList.remove("is-open");
            button.setAttribute("aria-expanded", "false");
        }
    });
}

function toggleStarProject(projectId) {
    const id = String(projectId);
    const starred = [...state.starredProjects];
    const idx = starred.indexOf(id);
    if (idx >= 0) {
        starred.splice(idx, 1);
    } else {
        starred.unshift(id);
    }
    state.starredProjects = starred;
    writeStoredArray("starred_projects", starred);
}

function toggleCompareProject(projectId) {
    const id = String(projectId);
    const compared = [...state.comparedProjects];
    const idx = compared.indexOf(id);
    if (idx >= 0) {
        compared.splice(idx, 1);
    } else {
        if (compared.length >= 3) {
            alert("You can compare up to 3 projects at once.");
            return false;
        }
        compared.push(id);
    }
    state.comparedProjects = compared;
    writeStoredArray("compared_projects", compared);
    return true;
}

function syncProjectStatusPills(activeStatus = "") {
    document.querySelectorAll("#admin-project-status-pills .filter-pill").forEach((button) => {
        const isActive = normalizeValue(button.dataset.status) === normalizeValue(activeStatus);
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

function syncProjectHiddenToggle(visibility = "", hiddenCount = 0) {
    const button = document.getElementById("admin-project-hidden-toggle");
    if (!button) {
        return;
    }
    const isHiddenOnly = normalizeValue(visibility) === "hidden";
    button.classList.toggle("active", isHiddenOnly);
    button.setAttribute("aria-pressed", String(isHiddenOnly));
    button.setAttribute("aria-label", isHiddenOnly ? "Showing hidden projects" : "Show hidden projects");
    button.title = isHiddenOnly ? "Showing hidden projects" : "Show hidden projects";
    const countNode = button.querySelector(".project-hidden-count");
    if (countNode) {
        countNode.textContent = String(hiddenCount || 0);
    }
    const labelNode = button.querySelector("span");
    if (labelNode) {
        labelNode.textContent = isHiddenOnly ? "Hidden only" : "Hidden";
    }
}

function buildConicGradient(entries, palette, total) {
    if (!entries.length || !total) {
        return "conic-gradient(#e5e7eb 0deg 360deg)";
    }
    let cursor = 0;
    const segments = entries.map(([, count], index) => {
        const start = cursor;
        cursor += (count / total) * 360;
        return `${palette[index % palette.length]} ${start}deg ${cursor}deg`;
    });
    return `conic-gradient(${segments.join(", ")})`;
}

function renderMetricCards(metrics) {
    return metrics.map((metric) => `
        <article class="metric-card dashboard-metric-card ${metric.variant ? `is-${metric.variant}` : ""}">
            <div class="metric-card-header">
                <span class="dashboard-metric-icon ${metric.variant ? `is-${metric.variant}` : ""}">
                    <i class="${metric.icon || 'fa-solid fa-chart-line'}"></i>
                </span>
            </div>
            <span class="muted-label">${metric.label}</span>
            <strong>${metric.value}</strong>
            ${metric.delta ? `<p class="dashboard-metric-delta ${metric.deltaClass || ""}">${metric.delta}</p>` : ""}
        </article>
    `).join("");
}

function renderFilteredCardList(items, emptyMessage, renderer) {
    return (items || []).map(renderer).join("") || emptyMarkup(emptyMessage);
}

function fillForm(form, values) {
    Object.entries(values).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (!field || field.type === "file") {
            return;
        }
        if (field.type === "checkbox") {
            field.checked = isDisplayedValue(value);
        } else {
            field.value = value ?? "";
        }
    });
}

async function initDashboard() {
    const [dashboardResult, meResult, projectsResult, skillsResult, certificationsResult, messagesResult] = await Promise.allSettled([
        dashboardApi.get(),
        authApi.me(),
        projectsApi.getAdmin(),
        skillsApi.listAdmin(),
        certificationsApi.listAdmin(),
        contactApi.list()
    ]);

    const dashboard = dashboardResult.status === "fulfilled" ? (dashboardResult.value.data || {}) : {};
    const profile = meResult.status === "fulfilled" ? (meResult.value.data?.profile || meResult.value.data || {}) : {};
    const allProjects = projectsResult.status === "fulfilled" ? extractPagedItems(projectsResult.value.data) : safeArray(dashboard.recentProjects);
    const allSkills = skillsResult.status === "fulfilled" ? safeArray(skillsResult.value.data) : [];
    const allCertifications = certificationsResult.status === "fulfilled" ? safeArray(certificationsResult.value.data) : [];
    const allMessages = messagesResult.status === "fulfilled" ? safeArray(messagesResult.value.data) : safeArray(dashboard.recentMessages);

    const recentProjects = safeArray(dashboard.recentProjects).length ? safeArray(dashboard.recentProjects) : allProjects.slice(0, 5);
    const recentMessages = safeArray(dashboard.recentMessages).length ? safeArray(dashboard.recentMessages) : allMessages.slice(0, 5);
    const displayedProjects = allProjects.filter((project) => isDisplayedValue(project.displayed));
    const distributionSource = displayedProjects.length ? displayedProjects : allProjects;
    const distributionCounts = distributionSource.reduce((acc, project) => {
        const category = formatEnumLabel(project.category || "OTHER");
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    const distributionEntries = Object.entries(distributionCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4);
    const distributionTotal = distributionEntries.reduce((sum, [, count]) => sum + count, 0);
    const total = distributionTotal || distributionSource.length || dashboard.totalProjects || 0;
    const palette = ["#6d5efc", "#73d0aa", "#8ab4f8", "#f7d87c", "#ffb86b", "#d4a5ff"];

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    document.getElementById("dashboard-date-range").textContent = formatDateRange(monthAgo, new Date());
    document.getElementById("dashboard-profile-name").textContent = profile.name || "Admin";
    document.getElementById("dashboard-profile-email").textContent = profile.email || "admin";
    document.getElementById("dashboard-profile-avatar").textContent = getInitials(profile.name || profile.email || "P");

    const unreadCount = allMessages.filter((message) => message.readStatus === false).length;
    document.getElementById("dashboard-notification-count").textContent = String(unreadCount || recentMessages.filter((message) => message.readStatus === false).length || 0);
    document.getElementById("dashboard-notification-button")?.addEventListener("click", () => {
        window.location.href = "/api/v1/admin/messages.html";
    });

    const recentProjectsDelta = recentProjects.filter((project) => {
        if (!project.createdAt) {
            return false;
        }
        const createdAt = new Date(project.createdAt);
        return createdAt >= monthAgo;
    }).length;
    const recentMessagesDelta = recentMessages.filter((message) => {
        if (!message.createdAt) {
            return false;
        }
        const createdAt = new Date(message.createdAt);
        return createdAt >= monthAgo;
    }).length;

    document.getElementById("dashboard-metrics").innerHTML = renderMetricCards([
        {
            label: "Total Projects",
            value: formatCount(dashboard.totalProjects ?? allProjects.length),
            icon: "fa-solid fa-briefcase",
            variant: "violet",
            delta: recentProjectsDelta ? `+${recentProjectsDelta} this month` : "Live inventory",
            deltaClass: recentProjectsDelta ? "" : "is-neutral"
        },
        {
            label: "Total Skills",
            value: formatCount(dashboard.totalSkills ?? allSkills.length),
            icon: "fa-solid fa-bolt",
            variant: "blue",
            delta: allSkills.length ? `${allSkills.filter((skill) => skill.displayed !== false).length} visible` : "Skill catalog",
            deltaClass: "is-neutral"
        },
        {
            label: "Certifications",
            value: formatCount(dashboard.totalCertifications ?? allCertifications.length),
            icon: "fa-solid fa-certificate",
            variant: "slate",
            delta: allCertifications.length ? `${allCertifications.filter((certification) => certification.displayed !== false).length} displayed` : "Credential vault",
            deltaClass: "is-neutral"
        },
        {
            label: "Messages",
            value: formatCount(dashboard.totalMessages ?? allMessages.length),
            icon: "fa-solid fa-envelope",
            variant: "ink",
            delta: recentMessagesDelta ? `+${recentMessagesDelta} this month` : "Inbox queue",
            deltaClass: recentMessagesDelta ? "" : "is-neutral"
        },
        {
            label: "Featured",
            value: formatCount(dashboard.totalFeaturedProjects ?? allProjects.filter((project) => project.featured).length),
            icon: "fa-regular fa-star",
            variant: "amber",
            delta: dashboard.totalFeaturedProjects ? "Highlighted work" : "No featured projects",
            deltaClass: "is-neutral"
        }
    ]);

    document.getElementById("dashboard-messages").innerHTML = recentMessages.length ? recentMessages.map((message) => `
        <article class="dashboard-message-card ${message.readStatus ? "" : "is-unread"} ${message.starred ? "is-starred" : ""}">
            <div class="dashboard-message-avatar">${getInitials(message.name || message.email || "A")}</div>
            <div class="dashboard-message-content">
                <div class="dashboard-message-topline">
                    <strong>${escapeHtml(message.subject || "No subject")}</strong>
                    <span>${formatRelativeTime(message.createdAt)}</span>
                </div>
                <p>${escapeHtml(message.message || "No message content provided.")}</p>
                <div class="chip-row dashboard-message-chips">
                    <span class="chip">${escapeHtml(message.name || "Anonymous")}</span>
                    <span class="chip">${escapeHtml(message.email || "Email not provided")}</span>
                </div>
            </div>
            <div class="dashboard-message-state">
                <span class="dashboard-message-dot ${message.readStatus ? "is-read" : "is-unread"}"></span>
                <span>${message.readStatus ? "Read" : "Unread"}</span>
            </div>
        </article>
    `).join("") : emptyMarkup("No recent messages.");

    document.getElementById("dashboard-projects").innerHTML = recentProjects.length ? recentProjects.map((project, index) => {
        const technologies = parseTags(project.technologies).slice(0, 3);
        return `
        <article class="dashboard-project-card">
            <header class="dashboard-project-header">
                <div class="dashboard-project-index">No ${String(index + 1).padStart(2, "0")}</div>
                <span class="chip dashboard-project-status">${formatEnumLabel(project.status || "UPDATED")}</span>
            </header>
            <div class="dashboard-project-body">
                <h3>${escapeHtml(project.title || "Untitled project")}</h3>
                <p>${escapeHtml(project.shortDescription || "No short description provided.")}</p>
            </div>
            <div class="dashboard-project-meta">
                <span class="chip">${formatEnumLabel(project.category || "OTHER")}</span>
                ${project.featured ? '<span class="chip">Featured</span>' : ""}
                ${project.completionDate ? `<span class="chip">${formatDashboardDate(project.completionDate)}</span>` : ""}
            </div>
            <div class="dashboard-project-tech-row">
                ${technologies.map((technology) => `<span class="chip">${escapeHtml(technology)}</span>`).join("") || '<span class="chip">Stack unavailable</span>'}
            </div>
        </article>`;
    }).join("") : emptyMarkup("No recent projects.");

    document.getElementById("dashboard-distribution-total").textContent = `${formatCount(total)} item${total === 1 ? "" : "s"}`;
    document.getElementById("dashboard-chart-total").textContent = formatCount(total);
    document.getElementById("dashboard-distribution-legend").innerHTML = distributionEntries.length ? distributionEntries.map(([label, count], index) => {
        const percentage = total ? Math.round((count / total) * 100) : 0;
        return `
            <div class="dashboard-legend-item">
                <span class="dashboard-legend-dot" style="background:${palette[index % palette.length]}"></span>
                <div class="dashboard-legend-copy">
                    <strong>${escapeHtml(label)}</strong>
                    <span>${formatCount(count)} projects</span>
                </div>
                <strong class="dashboard-legend-value">${percentage}%</strong>
            </div>
        `;
    }).join("") : emptyMarkup("Project distribution appears once projects are published.");

    const chart = document.getElementById("dashboard-chart");
    if (chart) {
        chart.style.background = buildConicGradient(distributionEntries, palette, total);
    }
}

function renderCertificationControls(certifications = []) {
    const container = document.getElementById("certification-controls");
    if (!container) {
        return;
    }
    const issuerOptions = [...new Set(certifications.map((certification) => certification.issuer).filter(Boolean))];
    container.innerHTML = `
        <input id="admin-cert-search" class="input" type="search" placeholder="Search title, issuer, or ID">
        <select id="admin-cert-issuer" class="input">
            <option value="">All issuers</option>
            ${issuerOptions.map((issuer) => `<option value="${issuer}">${issuer}</option>`).join("")}
        </select>
        <select id="admin-cert-file" class="input">
            <option value="">Any file state</option>
            <option value="with-file">With file</option>
            <option value="without-file">Without file</option>
        </select>
        <select id="admin-cert-visibility" class="input">
            <option value="">All visibility</option>
            <option value="displayed">Displayed</option>
            <option value="hidden">Hidden</option>
        </select>
    `;
}

function filterCertifications(certifications) {
    const search = normalizeValue(document.getElementById("admin-cert-search")?.value).toLowerCase();
    const issuer = document.getElementById("admin-cert-issuer")?.value || "";
    const fileState = document.getElementById("admin-cert-file")?.value || "";
    const visibility = document.getElementById("admin-cert-visibility")?.value || "";

    return certifications.filter((certification) => {
        const text = [
            certification.title,
            certification.issuer,
            certification.credentialId,
            certification.credentialUrl
        ].join(" ").toLowerCase();
        const hasFile = Boolean(certification.certificateFile?.downloadUrl);
        const matchesSearch = !search || text.includes(search);
        const matchesIssuer = !issuer || certification.issuer === issuer;
        const matchesFile = !fileState
            || (fileState === "with-file" && hasFile)
            || (fileState === "without-file" && !hasFile);
        const isVisible = certification.displayed !== false;
        const matchesVisibility = !visibility
            || (visibility === "displayed" && isVisible)
            || (visibility === "hidden" && !isVisible);
        return matchesSearch && matchesIssuer && matchesFile && matchesVisibility;
    });
}

function closeCertMenus(exceptButton = null) {
    document.querySelectorAll("[data-cert-menu-open]").forEach((button) => {
        if (button !== exceptButton) {
            button.closest(".cert-card-menu-wrap")?.classList.remove("is-open");
            button.setAttribute("aria-expanded", "false");
        }
    });
}

async function toggleCertificationVisibility(certification) {
    const payload = {
        title: certification.title,
        issuer: certification.issuer,
        issueDate: certification.issueDate,
        expiryDate: certification.expiryDate || null,
        credentialId: certification.credentialId || "",
        credentialUrl: certification.credentialUrl || "",
        certificateFileId: certification.certificateFile?.id || null,
        displayed: !(certification.displayed !== false)
    };
    await certificationsApi.update(certification.id, payload);
    await loadCertificationsAdmin();
}

function renderCertificationsAdmin(certifications) {
    const filtered = filterCertifications(certifications);
    document.getElementById("admin-certification-list").innerHTML = filtered.map((certification) => `
        <article class="table-card admin-cert-card" data-cert-card="${certification.id}">
            <header class="cert-card-top">
                <div class="cert-badge-row">
                    <span class="cert-icon-container"><i class="fa-solid fa-certificate"></i></span>
                    <span class="chip visibility-badge ${certification.displayed === false ? "is-hidden" : ""}">${certification.displayed === false ? "Hidden" : "Displayed"}</span>
                </div>
                
                <div class="cert-card-menu-wrap">
                    <button class="cert-card-menu-button" data-cert-menu-open="${certification.id}" type="button" aria-label="More options" aria-expanded="false">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="cert-card-menu" data-cert-card-menu="${certification.id}" role="menu" aria-label="Certification actions">
                        <button class="cert-card-menu-item" data-cert-action="edit" data-cert-id="${certification.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-pen"></i>
                            <span>Edit</span>
                        </button>
                        <button class="cert-card-menu-item" data-cert-action="toggle-visibility" data-cert-id="${certification.id}" type="button" role="menuitem">
                            <i class="fa-solid ${certification.displayed === false ? "fa-eye" : "fa-eye-slash"}"></i>
                            <span>${certification.displayed === false ? "Show in Portfolio" : "Hide from Portfolio"}</span>
                        </button>
                        ${certification.certificateFile?.downloadUrl ? `
                        <a class="cert-card-menu-item" href="${certification.certificateFile.downloadUrl}" target="_blank" rel="noreferrer" role="menuitem">
                            <i class="fa-solid fa-file-pdf"></i>
                            <span>Open Document</span>
                        </a>` : ""}
                        ${certification.credentialUrl ? `
                        <a class="cert-card-menu-item" href="${certification.credentialUrl}" target="_blank" rel="noreferrer" role="menuitem">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            <span>Verify Online</span>
                        </a>` : ""}
                        ${certification.credentialId ? `
                        <button class="cert-card-menu-item" data-cert-action="copy-id" data-cert-id-val="${certification.credentialId}" type="button" role="menuitem">
                            <i class="fa-solid fa-copy"></i>
                            <span>Copy Credential ID</span>
                        </button>` : ""}
                        <div class="cert-card-menu-divider" role="separator"></div>
                        <button class="cert-card-menu-item is-danger" data-cert-action="delete" data-cert-id="${certification.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                    
                    <div class="cert-delete-popover hidden" data-cert-confirmation="${certification.id}">
                        <p>Delete certification?</p>
                        <div class="cert-delete-popover-actions">
                            <button class="button button-ghost" type="button" data-cert-confirm-cancel="${certification.id}">Cancel</button>
                            <button class="button button-danger" type="button" data-cert-confirm-delete="${certification.id}">Confirm</button>
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="cert-card-body">
                <h3 class="cert-card-title">${certification.title}</h3>
                <p class="cert-card-issuer">${certification.issuer}</p>
            </div>
            
            <div class="cert-card-meta-row">
                <div class="cert-meta-item">
                    <span>Issue Date</span>
                    <strong>${certification.issueDate}</strong>
                </div>
                <div class="cert-meta-item">
                    <span>Expiration</span>
                    <strong>${certification.expiryDate || "Lifetime"}</strong>
                </div>
            </div>
            
            ${certification.credentialId ? `
            <div class="cert-card-id-block">
                <span>Credential ID:</span>
                <code>${certification.credentialId}</code>
            </div>` : ""}
        </article>
    `).join("") || emptyMarkup(certifications.length ? "No certifications match the selected filters." : "No certifications found.");

    // Bind event list handlers
    if (!document.getElementById("admin-certification-list")?.dataset.menuBound) {
        const list = document.getElementById("admin-certification-list");
        if (list) {
            list.dataset.menuBound = "true";
            list.addEventListener("click", async (event) => {
                const openButton = event.target.closest("[data-cert-menu-open]");
                const actionButton = event.target.closest("[data-cert-action]");
                const cancelButton = event.target.closest("[data-cert-confirm-cancel]");
                const confirmButton = event.target.closest("[data-cert-confirm-delete]");

                const hideCertConfirmations = () => {
                    list.querySelectorAll(".cert-delete-popover").forEach((panel) => panel.classList.add("hidden"));
                };

                if (openButton) {
                    event.stopPropagation();
                    const menuWrap = openButton.closest(".cert-card-menu-wrap");
                    const willOpen = !menuWrap?.classList.contains("is-open");
                    closeCertMenus(openButton);
                    menuWrap?.classList.toggle("is-open", willOpen);
                    openButton.setAttribute("aria-expanded", String(willOpen));
                    return;
                }

                if (cancelButton) {
                    event.stopPropagation();
                    hideCertConfirmations();
                    return;
                }

                if (confirmButton) {
                    event.stopPropagation();
                    const certId = confirmButton.getAttribute("data-cert-confirm-delete");
                    try {
                        await certificationsApi.remove(certId);
                        await loadCertificationsAdmin();
                    } catch (error) {
                        alert("Certification delete failed: " + error.message);
                    }
                    hideCertConfirmations();
                    return;
                }

                if (!actionButton) {
                    return;
                }
                event.stopPropagation();
                const certId = actionButton.getAttribute("data-cert-id");
                const certification = state.certificationsCache.find((item) => String(item.id) === String(certId));
                if (!certification && action !== "copy-id") {
                    return;
                }
                const action = actionButton.getAttribute("data-cert-action");
                try {
                    closeCertMenus();
                    if (action === "edit") {
                        state.editingCertificationId = certification.id;
                        state.currentCertification = certification;
                        openCertificationEditor();
                        fillForm(document.getElementById("certification-form"), certification);
                        hideCertConfirmations();
                        return;
                    }
                    if (action === "delete") {
                        hideCertConfirmations();
                        const confirmationPanel = list.querySelector(`[data-cert-confirmation="${certification.id}"]`);
                        confirmationPanel?.classList.remove("hidden");
                        return;
                    }
                    if (action === "toggle-visibility") {
                        await toggleCertificationVisibility(certification);
                        hideCertConfirmations();
                        return;
                    }
                    if (action === "copy-id") {
                        const val = actionButton.getAttribute("data-cert-id-val");
                        await copyTextToClipboard(val);
                        alert(`Copied Credential ID: "${val}"`);
                        hideCertConfirmations();
                    }
                } catch (error) {
                    alert("Certification action failed: " + error.message);
                }
            });
        }
    }
}

function renderProjectForm() {
    const form = document.getElementById("project-form");
    if (!form) return;
    form.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Project Registry</p>
                <h2 style="margin: 0;">Add or edit project details</h2>
            </div>
            <span class="chip">Database entry</span>
        </div>

        <!-- Wizard Navigation Stages -->
        <div class="project-wizard-steps" style="display: flex; gap: 8px; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid rgba(var(--accent-rgb), 0.08); padding-bottom: 16px;">
            <div class="project-wizard-step active" data-step="1" style="flex: 1; text-align: center; font-weight: 700; cursor: pointer; color: var(--accent); font-size: 0.88rem; transition: all 0.2s ease;">1. Core Info</div>
            <div class="project-wizard-step" data-step="2" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">2. Details</div>
            <div class="project-wizard-step" data-step="3" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">3. Tech & Links</div>
            <div class="project-wizard-step" data-step="4" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">4. Gallery</div>
        </div>

        <!-- Step 1: Core Info -->
        <div class="project-wizard-pane active" data-pane="1">
            <label><span>Title</span><input class="input" name="title" required maxlength="150" placeholder="Enter project title"></label>
            <label style="margin-top: 14px; display: block;"><span>Short description</span><input class="input" name="shortDescription" required maxlength="250" placeholder="Brief summary of the project"></label>
            <div class="field-grid" style="margin-top: 14px;">
                <label><span>Category</span><select class="input" name="category">${markupOptions(PROJECT_CATEGORIES)}</select></label>
                <label><span>Status</span><select class="input" name="status">${markupOptions(PROJECT_STATUSES)}</select></label>
            </div>
            <div class="field-grid" style="margin-top: 14px;">
                <label><span>Completion Date</span><input class="input" type="date" name="completionDate"></label>
            </div>
        </div>

        <!-- Step 2: Details -->
        <div class="project-wizard-pane" data-pane="2" style="display: none;">
            <label><span>Detailed description</span><textarea class="input textarea" name="detailedDescription" style="height: 220px;" required placeholder="Detailed info about the project..."></textarea></label>
        </div>

        <!-- Step 3: Tech & Links -->
        <div class="project-wizard-pane" data-pane="3" style="display: none;">
            <label><span>Technologies</span><input class="input" name="technologies" required maxlength="500" placeholder="e.g. Java, Spring Boot, React (comma separated)"></label>
            <div class="field-grid" style="margin-top: 14px;">
                <label><span>GitHub URL</span><input class="input" name="githubUrl" placeholder="https://github.com/..."></label>
                <label><span>Live URL</span><input class="input" name="liveUrl" placeholder="https://..."></label>
            </div>
            <div style="margin-top: 18px; display: flex; gap: 20px;">
                <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" name="displayed" checked> <span>Display in portfolio</span>
                </label>
                <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" name="featured"> <span>Featured project</span>
                </label>
            </div>
        </div>

        <!-- Step 4: Gallery -->
        <div class="project-wizard-pane" data-pane="4" style="display: none;">
            <label><span>Image URL (comma separated)</span><input class="input" name="imageUrl" id="project-imageUrl-field" placeholder="https://..."></label>
            
            <div style="margin-top: 16px;">
                <span class="muted-label" style="display: block; margin-bottom: 8px;">Upload Project Images</span>
                <div class="drag-drop-zone" id="project-drag-drop" style="border: 2px dashed rgba(var(--accent-rgb), 0.25); border-radius: 16px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(var(--accent-rgb), 0.01);">
                    <i class="fa-solid fa-images" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 12px;"></i>
                    <p style="margin: 0; font-weight: 600; font-size: 0.9rem;">Drag & drop project screenshots here</p>
                    <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--muted);">or click to upload multiple images</p>
                    <input type="file" id="project-files-input" accept="image/*" multiple style="display: none;">
                </div>
                
                <div id="project-upload-status" style="margin-top: 10px; font-size: 0.82rem; font-weight: 500; display: none;"></div>
                
                <div id="project-images-preview-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 18px;">
                    <!-- Uploaded image previews will render here dynamically -->
                </div>
            </div>
        </div>

        <div class="form-actions" style="margin-top: 24px; display: flex; justify-content: space-between;">
            <button class="button button-ghost" id="project-wizard-prev" type="button" style="visibility: hidden;"><i class="fa-solid fa-arrow-left" style="margin-right: 6px;"></i>Back</button>
            <div>
                <button class="button button-ghost" id="project-wizard-next" type="button">Next<i class="fa-solid fa-arrow-right" style="margin-left: 6px;"></i></button>
                <button class="button button-primary" id="project-wizard-submit" type="submit" style="display: none;"><i class="fa-solid fa-check" style="margin-right:6px;"></i>${state.editingProjectId ? "Update" : "Create"}</button>
            </div>
        </div>
    `;
}

function openProjectEditor() {
    renderProjectForm();
    bindProjectForm();
    const modal = document.getElementById("project-editor-modal");
    document.getElementById("project-modal-title").textContent = state.editingProjectId ? "Edit project" : "New project";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeProjectEditor() {
    const modal = document.getElementById("project-editor-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.editingProjectId = null;
    state.currentProject = null;
}

function buildProjectDetailMarkup(project) {
    const technologies = parseTags(project.technologies);
    const mediaUrl = project.imageFile?.downloadUrl || project.imageUrl || "";
    const mediaUrls = mediaUrl.split(",").map(url => url.trim()).filter(Boolean);
    const mainMedia = mediaUrls[0] || "";

    const rows = [
        { label: "Category", value: project.category || "Project" },
        { label: "Status", value: formatEnumLabel(project.status || "Unknown") },
        { label: "Featured", value: project.featured ? "Yes" : "No" },
        { label: "Displayed", value: isDisplayedValue(project.displayed) ? "Yes" : "No" },
        { label: "Completed", value: project.completionDate || "In progress" },
        { label: "Stack", value: `${technologies.length} tech${technologies.length === 1 ? "" : "s"}` }
    ];

    let mediaHtml = "";
    if (mediaUrls.length > 1) {
        mediaHtml = `
            <div class="project-detail-gallery" style="display: grid; gap: 12px; margin-bottom: 20px; width: 100%;">
                <div class="project-detail-media has-image" id="project-detail-main-media-wrap" style="border-radius: 16px; overflow: hidden; border: 1px solid var(--border); padding-top: 56.25%; position: relative; width: 100%;">
                    <img id="project-detail-main-media" src="${mainMedia}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;" alt="${escapeHtml(project.title || "Project")} preview">
                </div>
                <div class="project-detail-thumbnails" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; width: 100%;">
                    ${mediaUrls.map((url, idx) => `
                        <div class="project-detail-thumb ${idx === 0 ? "active" : ""}" data-url="${url}" style="width: 80px; height: 50px; border-radius: 8px; overflow: hidden; border: 2px solid ${idx === 0 ? "var(--accent)" : "var(--border)"}; cursor: pointer; flex-shrink: 0; position: relative; transition: border-color 0.2s ease;">
                            <img src="${url}" style="width:100%; height:100%; object-fit: cover;" alt="Thumbnail ${idx + 1}">
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    } else {
        mediaHtml = `
            <div class="project-detail-media ${mainMedia ? "has-image" : ""}">
                ${mainMedia ? `<img src="${mainMedia}" alt="${escapeHtml(project.title || "Project")} preview">` : `<span>${escapeHtml((project.title || "P").substring(0, 2).toUpperCase())}</span>`}
            </div>
        `;
    }

    return `
        <div class="project-detail-shell">
            <div class="project-detail-hero">
                <div class="project-detail-hero-main" style="flex-direction: column; align-items: flex-start; gap: 20px;">
                    ${mediaHtml}
                    <div class="project-detail-hero-copy" style="padding-left: 0;">
                        <p class="eyebrow" style="color: var(--accent-alt); margin-bottom: 6px;">PROJECT DETAILS</p>
                        <h2 style="margin-top: 0;">${escapeHtml(project.title || "Untitled project")}</h2>
                        <p class="project-detail-subtitle">${escapeHtml(project.shortDescription || "No short description provided.")}</p>
                    </div>
                </div>
                <div class="project-detail-hero-aside">
                    <span class="chip">${project.displayed === false ? "Hidden" : "Displayed"}</span>
                    <span class="chip">${escapeHtml(formatProjectStatus(project.status))}</span>
                </div>
            </div>
            <div class="project-detail-grid">
                ${rows.map((row) => `
                    <article class="project-detail-card">
                        <span>${escapeHtml(row.label)}</span>
                        <strong>${escapeHtml(String(row.value))}</strong>
                    </article>
                `).join("")}
            </div>
            <div class="project-detail-body">
                <p>${escapeHtml(project.detailedDescription || "No detailed description provided.")}</p>
                <div class="chip-row" style="margin-top: 4px;">
                    ${technologies.map((tech) => `<span class="chip">${escapeHtml(tech)}</span>`).join("") || '<span class="chip">Stack unavailable</span>'}
                </div>
            </div>
            <div class="project-detail-actions">
                <a class="button button-outline project-notes-link" href="/api/v1/admin/project-notes.html?projectId=${project.id}" data-project-notes="${project.id}">
                    <i class="fa-solid fa-file-lines"></i>
                    <span>Notes page</span>
                </a>
                ${project.githubUrl ? `<a class="button button-outline" href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                ${project.liveUrl ? `<a class="button button-outline" href="${escapeHtml(project.liveUrl)}" target="_blank" rel="noreferrer">Live</a>` : ""}
            </div>
        </div>
    `;
}

function openProjectDetail(project) {
    const modal = document.getElementById("project-detail-modal");
    const content = document.getElementById("project-detail-content");
    const title = document.getElementById("project-detail-title");
    if (!modal || !content || !title) {
        return;
    }
    title.textContent = "Project overview";
    content.innerHTML = buildProjectDetailMarkup(project);

    // Bind thumbnail click events if they exist
    const mainImg = content.querySelector("#project-detail-main-media");
    const thumbs = content.querySelectorAll(".project-detail-thumb");
    thumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => {
            const url = thumb.getAttribute("data-url");
            if (mainImg) mainImg.src = url;
            thumbs.forEach(t => t.style.borderColor = "var(--border)");
            thumb.style.borderColor = "var(--accent)";
        });
    });

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeProjectDetail() {
    const modal = document.getElementById("project-detail-modal");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function sortProjectNotes(notes, sortValue = "createdAt_DESC") {
    const [field, direction] = String(sortValue || "createdAt_DESC").split("_");
    const sorted = [...notes].sort((left, right) => {
        if (left.pinned !== right.pinned) {
            return left.pinned ? -1 : 1;
        }
        if (field === "title") {
            return direction === "ASC"
                ? normalizeValue(left.title).localeCompare(normalizeValue(right.title))
                : normalizeValue(right.title).localeCompare(normalizeValue(left.title));
        }
        const leftValue = new Date(left[field] || left.createdAt || 0).getTime();
        const rightValue = new Date(right[field] || right.createdAt || 0).getTime();
        return direction === "ASC" ? leftValue - rightValue : rightValue - leftValue;
    });
    return sorted;
}

function filterProjectNotes(notes, options = {}) {
    const search = normalizeValue(options.search ?? "").toLowerCase();
    const pinnedOnly = Boolean(options.pinnedOnly);
    const noteType = options.type || "";
    return notes.filter((note) => {
        const haystack = [
            note.title,
            note.content,
            note.type,
            parseTags(note.tags).join(" ")
        ].join(" ").toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        const matchesPinned = !pinnedOnly || note.pinned;
        const matchesType = !noteType || note.type === noteType;
        return matchesSearch && matchesPinned && matchesType;
    });
}

function renderProjectNotesSummary(project, notes) {
    const noteCount = notes.length;
    const pinnedCount = notes.filter((note) => note.pinned).length;
    const latestNote = notes[0];
    const techCount = parseTags(project.technologies).length;
    const recentNotes = notes.slice(0, 3);
    return `
        <div class="notes-summary-grid">
            <article class="notes-summary-card">
                <span class="muted-label">Project</span>
                <strong>${escapeHtml(project.title || "Project")}</strong>
                <p class="section-copy">${escapeHtml(project.shortDescription || "Track implementation notes, features, and decisions.")}</p>
            </article>
            <article class="notes-summary-card">
                <span class="muted-label">Notes</span>
                <strong>${noteCount}</strong>
                <p class="section-copy">${pinnedCount} pinned, ${noteCount - pinnedCount} regular</p>
            </article>
            <article class="notes-summary-card">
                <span class="muted-label">Stack</span>
                <strong>${techCount}</strong>
                <p class="section-copy">${techCount ? parseTags(project.technologies).slice(0, 4).join(", ") : "No technologies listed"}</p>
            </article>
            <article class="notes-summary-card">
                <span class="muted-label">Latest update</span>
                <strong>${latestNote ? formatTimestamp(latestNote.updatedAt || latestNote.createdAt) : "None yet"}</strong>
                <p class="section-copy">${latestNote ? escapeHtml(latestNote.title) : "Create your first note to start tracking work."}</p>
                <div class="notes-inline-preview">
                    ${recentNotes.map((note) => `
                        <div class="notes-inline-preview-item">
                            <span>${escapeHtml(note.title)}</span>
                            <strong>${formatTimestamp(note.updatedAt || note.createdAt, false)}</strong>
                        </div>
                    `).join("")}
                </div>
            </article>
        </div>
    `;
}

function getProjectNoteCounts(notes = []) {
    return {
        total: notes.length,
        pinned: notes.filter((note) => note.pinned).length,
        pending: notes.filter((note) => note.type === "PENDING").length,
        inProgress: notes.filter((note) => note.type === "IN_PROGRESS").length,
        review: notes.filter((note) => note.type === "REVIEW").length,
        completed: notes.filter((note) => note.type === "COMPLETED").length
    };
}

function renderProjectNoteCounts(notes = []) {
    const grid = document.getElementById("notes-count-grid");
    const totalButtons = [
        document.getElementById("notes-count-total"),
        document.getElementById("notes-count-button")
    ].filter(Boolean);
    if (!grid || !totalButtons.length) {
        return;
    }
    const counts = getProjectNoteCounts(notes);
    totalButtons.forEach((button) => {
        button.textContent = `${counts.total} note${counts.total === 1 ? "" : "s"}`;
    });
    grid.innerHTML = [
        ["Total", counts.total, "violet", true],
        ["Pending", counts.pending, "amber", true],
        ["In Progress", counts.inProgress, "blue", true],
        ["Review", counts.review, "purple", true],
        ["Completed", counts.completed, "green", true],
        ["Pinned", counts.pinned, "slate", false]
    ].map(([label, value, tone, clickable]) => `
        <button class="notes-count-chip is-${tone}" type="${clickable ? "button" : "button"}" ${clickable ? `data-note-count-filter="${label.toLowerCase().replaceAll(" ", "-")}"` : "disabled"}>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
        </button>
    `).join("");
        grid.querySelectorAll("[data-note-count-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            const filter = button.dataset.noteCountFilter || "total";
            if (filter === "total") {
                notesFilter = "ALL";
            } else {
                notesFilter = filter.toUpperCase().replaceAll("-", "_");
            }
            renderRedesignedNotesList();
            const pageNotesTab = document.querySelector('#project-notes-page-tabs .tab-btn[data-tab="notes"]');
            const modalNotesTab = document.querySelector('#project-notes-modal:not(.hidden) .project-notes-tabs .tab-btn[data-tab="notes"]');
            (pageNotesTab || modalNotesTab)?.click();
        });
    });
    const overviewAction = document.getElementById("project-notes-count-button");
    if (overviewAction) {
        overviewAction.dataset.countReady = "true";
    }
}

function renderProjectNoteForm(note = null, formId = "project-note-form") {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    const isEditing = Boolean(note);
    if (formId === "project-notes-page-form") {
        form.innerHTML = `
            <div class="notes-composer-header">
                <div>
                    <p class="eyebrow">Track work</p>
                    <h2>${isEditing ? "Edit note" : "Add note"}</h2>
                    <p class="form-help">Write a note, choose a status, and save it to the project timeline.</p>
                </div>
                <span class="chip">${isEditing ? "Updating" : "Journal entry"}</span>
            </div>
            <div class="notes-composer-row">
                <label class="notes-composer-title">
                    <span>Note title</span>
                    <input class="input" name="title" required maxlength="120" placeholder="Write a new note...">
                </label>
                <label class="notes-composer-status select-wrapper">
                    <span>Type</span>
                    <select class="input" name="type">
                        ${PROJECT_NOTE_PAGE_TYPES.map((type) => `<option value="${type}">${formatEnumLabel(type)}</option>`).join("")}
                    </select>
                </label>
                <button class="button button-primary notes-composer-submit" type="submit">
                    <i class="fa-solid fa-note-sticky" style="margin-right:6px;"></i>${isEditing ? "Save note" : "Add Note"}
                </button>
            </div>
            <input type="hidden" name="content">
            <div class="form-actions notes-composer-footer">
                <button class="button button-ghost" type="button" data-note-reset>Clear</button>
            </div>
        `;
        if (note) {
            fillForm(form, note);
            form.elements.title.value = note.title || "";
            form.elements.type.value = PROJECT_NOTE_PAGE_TYPES.includes(note.type) ? note.type : "PENDING";
        } else {
            form.reset();
            form.elements.type.value = "PENDING";
        }
        return;
    }
    form.innerHTML = `
        <div class="form-hero" style="padding-top: 0;">
            <div>
                <p class="eyebrow">Track work</p>
                <h2>${isEditing ? "Edit note" : "Add note"}</h2>
                <p class="form-help">Capture which feature or technology you used, why it mattered, and what should happen next.</p>
            </div>
            <span class="chip">${isEditing ? "Updating" : "Journal entry"}</span>
        </div>
        <label><span>Note title</span><input class="input" name="title" required maxlength="120" placeholder="e.g. Added JWT refresh flow"></label>
        <div class="field-grid">
            <label><span>Type</span>
                <select class="input" name="type">
                    ${PROJECT_NOTE_TYPES.map((type) => `<option value="${type}">${formatEnumLabel(type)}</option>`).join("")}
                </select>
            </label>
            <label><span>Tags</span><input class="input" name="tags" maxlength="500" placeholder="Spring Boot, JWT, Swagger"></label>
        </div>
        <label><span>Note content</span><textarea class="input textarea" name="content" required placeholder="Explain the feature, technology, decision, or milestone you want to remember."></textarea></label>
        <label class="notes-pin-toggle"><span><input type="checkbox" name="pinned"> Pin this note</span></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-note-sticky" style="margin-right:6px;"></i>${isEditing ? "Update note" : "Save note"}</button>
            <button class="button button-ghost" type="button" data-note-reset>Clear</button>
        </div>
    `;
    if (note) {
        fillForm(form, note);
        form.elements.tags.value = parseTags(note.tags).join(", ");
        form.elements.pinned.checked = Boolean(note.pinned);
        form.elements.type.value = note.type || PROJECT_NOTE_TYPES[0];
    } else {
        form.reset();
        form.elements.type.value = PROJECT_NOTE_TYPES[0];
        form.elements.pinned.checked = false;
    }
}

function renderProjectNotesList(notes, options = {}) {
    const container = document.getElementById(options.containerId || "project-notes-list");
    if (!container) {
        return;
    }
    const notesPageMode = options.pageMode || document.body.dataset.page === "project-notes";
    const filtered = notesPageMode
        ? notes.filter((note) => notesFilter === "ALL" ? true : (note.type || "").toUpperCase() === notesFilter)
        : filterProjectNotes(notes, {
            search: options.search ?? document.getElementById(options.searchId || "project-notes-search")?.value,
            pinnedOnly: options.pinnedOnly ?? document.getElementById(options.pinnedOnlyId || "project-notes-pinned-only")?.checked,
            type: options.type ?? (document.getElementById(options.typeId || "")?.value || "")
        });
    const sorted = sortProjectNotes(filtered, notesPageMode ? notesSort : (options.sort ?? (document.getElementById(options.sortId || "")?.value || "createdAt_DESC")));
    const limited = typeof options.limit === "number" ? sorted.slice(0, options.limit) : sorted;
    const showActions = options.showActions !== false;
    container.innerHTML = limited.length ? limited.map((note) => {
        const statusClass = (note.type || "PENDING").toLowerCase().replaceAll("_", "-");
        const fullTimestamp = formatTimestamp(note.createdAt);
        const timestampParts = fullTimestamp.split(",");
        const dateLabel = timestampParts[0] || fullTimestamp;
        const timeLabel = timestampParts.slice(1).join(",").trim();
        return `
            <article class="project-note-card border-${statusClass} ${note.pinned ? "is-pinned" : ""}">
                <div class="project-note-card-main">
                    <div class="project-note-card-copy">
                        <h3>${escapeHtml(note.title)}</h3>
                        <p>${escapeHtml(note.content)}</p>
                        <div class="project-note-status-pill pill-${statusClass}">
                            <span class="dot dot-${statusClass}"></span>
                            <span>${formatEnumLabel(note.type || "PENDING")}</span>
                        </div>
                        ${note.pinned ? '<span class="project-note-mini-chip">Pinned</span>' : ""}
                    </div>
                    <div class="project-note-card-meta">
                        <div class="project-note-meta-item"><i class="fa-regular fa-calendar"></i><span>${escapeHtml(dateLabel)}</span></div>
                        <div class="project-note-meta-item"><i class="fa-regular fa-clock"></i><span>${escapeHtml(timeLabel || "")}</span></div>
                        <div class="project-note-meta-item"><i class="fa-regular fa-user"></i><span>Added by You</span></div>
                    </div>
                    ${showActions ? `
                        <div class="project-note-actions-menu">
                            <button class="project-note-actions-trigger" type="button" aria-label="Note actions">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div class="note-actions-dropdown hidden">
                                <button class="note-action-btn edit-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button class="note-action-btn pin-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-thumbtack"></i> ${note.pinned ? "Unpin" : "Pin"}</button>
                                <button class="note-action-btn advance-status-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-forward-step"></i> Advance</button>
                                <button class="note-action-btn delete-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    ` : ""}
                </div>
            </article>
        `;
    }).join("") : emptyMarkup(options.emptyMessage || "No notes recorded yet. Add the first one to begin your project log.");

    if (!showActions) {
        return;
    }
    if (!container.dataset.menuBound) {
        container.dataset.menuBound = "true";
        container.addEventListener("click", async (event) => {
            const trigger = event.target.closest(".project-note-actions-trigger");
            const actionButton = event.target.closest(".edit-btn, .pin-btn, .advance-status-btn, .delete-btn");

            if (trigger) {
                event.stopPropagation();
                const menuWrap = trigger.closest(".project-note-actions-menu");
                container.querySelectorAll(".note-actions-dropdown").forEach((dropdown) => {
                    if (dropdown !== trigger.nextElementSibling) {
                        dropdown.classList.add("hidden");
                    }
                });
                const dropdown = trigger.nextElementSibling;
                dropdown?.classList.toggle("hidden");
                menuWrap?.classList.toggle("is-open", dropdown ? !dropdown.classList.contains("hidden") : false);
                return;
            }

            if (!actionButton) {
                return;
            }
            event.stopPropagation();
            const noteId = actionButton.getAttribute("data-id");
            const note = state.currentProjectNotes.find((item) => String(item.id) === String(noteId));
            if (!note) {
                return;
            }
            const closeMenus = () => {
                container.querySelectorAll(".note-actions-dropdown").forEach((dropdown) => dropdown.classList.add("hidden"));
                container.querySelectorAll(".project-note-actions-menu").forEach((menu) => menu.classList.remove("is-open"));
            };

            if (actionButton.classList.contains("edit-btn")) {
                state.editingProjectNoteId = note.id;
                renderProjectNoteForm(note, options.formId || "project-note-form");
                document.getElementById(options.formId || "project-note-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                closeMenus();
                return;
            }

            if (actionButton.classList.contains("pin-btn")) {
                try {
                    await projectsApi.updateNote(state.currentProject.id, note.id, {
                        title: note.title,
                        content: note.content,
                        type: note.type,
                        tags: parseTags(note.tags).join(", "),
                        pinned: !note.pinned
                    });
                    closeMenus();
                    await refreshProjectNotesSurface(options);
                } catch (error) {
                    alert("Failed to update note: " + error.message);
                }
                return;
            }

            if (actionButton.classList.contains("advance-status-btn")) {
                const order = ["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED"];
                const currentIndex = Math.max(order.indexOf(note.type || "PENDING"), 0);
                const nextType = order[(currentIndex + 1) % order.length];
                try {
                    await projectsApi.updateNote(state.currentProject.id, note.id, {
                        title: note.title,
                        content: note.content,
                        type: nextType,
                        tags: parseTags(note.tags).join(", "),
                        pinned: Boolean(note.pinned)
                    });
                    closeMenus();
                    await refreshProjectNotesSurface(options);
                } catch (error) {
                    alert("Failed to advance note status: " + error.message);
                }
                return;
            }

            if (actionButton.classList.contains("delete-btn")) {
                if (confirmDanger(`Delete note "${note.title}"? This cannot be undone.`)) {
                    try {
                        await projectsApi.removeNote(state.currentProject.id, note.id);
                        closeMenus();
                        await refreshProjectNotesSurface(options);
                    } catch (error) {
                        alert("Failed to delete note: " + error.message);
                    }
                }
            }
        });
    }
}

async function refreshProjectNotesSurface(options = {}) {
    if (!state.currentProject) {
        return;
    }
    const notes = await fetchProjectNotes(state.currentProject.id, options.query || {});
    state.currentProjectNotes = notes;
    if (options.summaryId) {
        document.getElementById(options.summaryId).innerHTML = renderProjectNotesSummary(state.currentProject, notes);
    }
    renderProjectNotesList(notes, options);
}

async function fetchProjectNotes(projectId, params = {}) {
    const response = await projectsApi.notes(projectId, params);
    return response.data || [];
}

function bindProjectNoteComposer(formId, onSaved) {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    form.onsubmit = async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            const payload = {
                title: normalizeValue(fd.get("title")),
                type: fd.get("type"),
                content: normalizeValue(fd.get("content")) || normalizeValue(fd.get("title")),
                tags: normalizeValue(fd.get("tags")),
                pinned: fd.get("pinned") === "on"
            };
            if (!payload.title) {
                throw new Error("Note title is required.");
            }
            if (!payload.content) {
                throw new Error("Note content is required.");
            }
            if (state.editingProjectNoteId) {
                await projectsApi.updateNote(state.currentProject.id, state.editingProjectNoteId, payload);
            } else {
                await projectsApi.createNote(state.currentProject.id, payload);
            }
            state.editingProjectNoteId = null;
            renderProjectNoteForm(null, formId);
            await onSaved?.();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    };
    form.querySelector("[data-note-reset]")?.addEventListener("click", () => {
        state.editingProjectNoteId = null;
        renderProjectNoteForm(null, formId);
    });
}

let notesFilter = "ALL";
let notesSort = "createdAt_DESC";

async function refreshRedesignedNotes() {
    if (!state.currentProject) return;
    const listContainer = document.getElementById("project-notes-list-redesigned");
    if (listContainer) {
        listContainer.innerHTML = `<div class="notes-loading">Loading notes...</div>`;
    }
    try {
        const notes = await fetchProjectNotes(state.currentProject.id);
        state.currentProjectNotes = notes;
        if (document.getElementById("notes-count-grid")) {
            renderTabPanelContent("overview");
        }
        renderRedesignedNotesList();
    } catch (error) {
        if (listContainer) {
            listContainer.innerHTML = emptyMarkup(error.message || "Unable to load notes.");
        }
    }
}

function renderRedesignedNotesList() {
    const listContainer = document.getElementById("project-notes-list-redesigned");
    if (!listContainer) return;

    let notes = state.currentProjectNotes || [];
    
    // Filter
    if (notesFilter !== "ALL") {
        notes = notes.filter(n => n.type === notesFilter);
    }
    
    // Sort
    const [field, direction] = notesSort.split("_");
    notes.sort((left, right) => {
        if (field === "title") {
            return direction === "ASC"
                ? (left.title || "").localeCompare(right.title || "")
                : (right.title || "").localeCompare(left.title || "");
        }
        const leftValue = new Date(left[field] || left.createdAt || 0).getTime();
        const rightValue = new Date(right[field] || right.createdAt || 0).getTime();
        return direction === "ASC" ? leftValue - rightValue : rightValue - leftValue;
    });

    if (notes.length === 0) {
        listContainer.innerHTML = emptyMarkup("No notes found.");
        return;
    }

    listContainer.innerHTML = notes.map(note => {
        const statusClass = (note.type || "PENDING").toLowerCase().replace("_", "-");
        const statusLabel = formatEnumLabel(note.type || "PENDING");
        const dateStr = formatTimestamp(note.createdAt).split(",")[0] || "";
        const timeStr = formatTimestamp(note.createdAt).split(",")[1] || "";
        
        return `
            <div class="note-card-redesigned border-${statusClass}" data-note-id="${note.id}">
                <div class="note-card-main-content">
                    <h3>${escapeHtml(note.title)}</h3>
                    <p>${escapeHtml(note.content)}</p>
                    <div class="note-card-status-pill pill-${statusClass}">
                        <span class="dot dot-${statusClass}"></span>
                        <span>${statusLabel}</span>
                    </div>
                </div>
                <div class="note-card-meta-actions">
                    <div class="note-card-meta-info">
                        <div class="meta-item"><i class="fa-regular fa-calendar"></i> <span>${dateStr}</span></div>
                        <div class="meta-item"><i class="fa-regular fa-clock"></i> <span>${timeStr}</span></div>
                        <div class="meta-item"><i class="fa-regular fa-user"></i> <span>Added by You</span></div>
                    </div>
                    <div class="note-card-actions-menu">
                        <button class="note-actions-trigger" type="button" aria-label="Note actions"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div class="note-actions-dropdown hidden">
                            <button class="note-action-btn edit-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="note-action-btn pin-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-thumbtack"></i> ${note.pinned ? "Unpin" : "Pin"}</button>
                            <button class="note-action-btn advance-status-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-forward-step"></i> Advance</button>
                            <button class="note-action-btn delete-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (!listContainer.dataset.menuBound) {
        listContainer.dataset.menuBound = "true";
        listContainer.addEventListener("click", async (event) => {
            const trigger = event.target.closest(".note-actions-trigger");
            const actionButton = event.target.closest(".edit-btn, .pin-btn, .advance-status-btn, .delete-btn");

            if (trigger) {
                event.stopPropagation();
                const menuWrap = trigger.closest(".note-card-actions-menu");
                listContainer.querySelectorAll(".note-actions-dropdown").forEach((dropdown) => {
                    if (dropdown !== trigger.nextElementSibling) {
                        dropdown.classList.add("hidden");
                    }
                });
                trigger.nextElementSibling?.classList.toggle("hidden");
                menuWrap?.classList.toggle("is-open", !trigger.nextElementSibling?.classList.contains("hidden"));
                return;
            }

            if (!actionButton) {
                return;
            }
            event.stopPropagation();
            const noteId = actionButton.getAttribute("data-id");
            const note = state.currentProjectNotes.find((item) => String(item.id) === String(noteId));
            if (!note) {
                return;
            }
            const closeMenus = () => {
                listContainer.querySelectorAll(".note-actions-dropdown").forEach((dropdown) => dropdown.classList.add("hidden"));
                listContainer.querySelectorAll(".note-card-actions-menu").forEach((menu) => menu.classList.remove("is-open"));
            };
            if (actionButton.classList.contains("edit-btn")) {
                state.editingProjectNoteId = note.id;
                document.getElementById("quick-note-title").value = note.title || "";
                document.getElementById("quick-note-content").value = note.content || "";
                document.getElementById("quick-note-status").value = note.type || "PENDING";
                const form = document.getElementById("project-notes-quick-form");
                const submitBtn = form?.querySelector(".quick-add-btn");
                if (submitBtn) submitBtn.textContent = "Save Note";
                document.getElementById("quick-note-title")?.focus();
                closeMenus();
                return;
            }
            if (actionButton.classList.contains("pin-btn")) {
                try {
                    await projectsApi.updateNote(state.currentProject.id, note.id, {
                        title: note.title,
                        content: note.content,
                        type: note.type,
                        tags: parseTags(note.tags).join(", "),
                        pinned: !note.pinned
                    });
                    closeMenus();
                    await refreshRedesignedNotes();
                } catch (error) {
                    alert("Failed to update note: " + error.message);
                }
                return;
            }
            if (actionButton.classList.contains("advance-status-btn")) {
                const order = ["PENDING", "IN_PROGRESS", "REVIEW", "COMPLETED"];
                const currentIndex = Math.max(order.indexOf(note.type || "PENDING"), 0);
                const nextType = order[(currentIndex + 1) % order.length];
                try {
                    await projectsApi.updateNote(state.currentProject.id, note.id, {
                        title: note.title,
                        content: note.content,
                        type: nextType,
                        tags: parseTags(note.tags).join(", "),
                        pinned: Boolean(note.pinned)
                    });
                    closeMenus();
                    await refreshRedesignedNotes();
                } catch (error) {
                    alert("Failed to advance note status: " + error.message);
                }
                return;
            }
            if (actionButton.classList.contains("delete-btn")) {
                if (confirmDanger(`Delete note "${note.title}"? This cannot be undone.`)) {
                    try {
                        await projectsApi.removeNote(state.currentProject.id, note.id);
                        closeMenus();
                        await refreshRedesignedNotes();
                    } catch (error) {
                        alert("Failed to delete note: " + error.message);
                    }
                }
            }
        });
    }
}

// Global click listener to close dropdowns
document.addEventListener("click", () => {
    document.querySelectorAll(".note-actions-dropdown").forEach(dropdown => {
        dropdown.classList.add("hidden");
    });
    document.querySelectorAll(".project-note-actions-menu, .note-card-actions-menu").forEach((menu) => {
        menu.classList.remove("is-open");
    });
});

function switchNotesTab(tabName) {
    const modal = document.getElementById("project-notes-modal");
    if (!modal) return;
    
    // Toggle active classes on buttons
    modal.querySelectorAll(".project-notes-tabs .tab-btn").forEach(btn => {
        if (btn.getAttribute("data-tab") === tabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Toggle hidden on panels
    modal.querySelectorAll(".project-notes-tab-panels .tab-panel").forEach(panel => {
        if (panel.id === `panel-${tabName}`) {
            panel.classList.remove("hidden");
        } else {
            panel.classList.add("hidden");
        }
    });

    // Render tab-specific content
    renderTabPanelContent(tabName);
}

function renderTabPanelContent(tabName) {
    const project = state.currentProject;
    if (!project) return;
    const notes = state.currentProjectNotes || [];

    if (tabName === "overview") {
        document.getElementById("overview-title").textContent = project.title || "";
        document.getElementById("overview-category").textContent = formatEnumLabel(project.category || "");
        document.getElementById("overview-url").innerHTML = project.liveUrl 
            ? `<a href="${project.liveUrl}" target="_blank" class="admin-link">${project.liveUrl} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` 
            : '<span class="muted-label">None</span>';
        document.getElementById("overview-github").innerHTML = project.githubUrl 
            ? `<a href="${project.githubUrl}" target="_blank" class="admin-link">${project.githubUrl} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` 
            : '<span class="muted-label">None</span>';
        document.getElementById("overview-date").textContent = project.completionDate || "Not completed yet";
        document.getElementById("overview-featured").textContent = project.featured ? "Yes" : "No";
        document.getElementById("overview-displayed").textContent = project.displayed !== false ? "Visible on Portfolio" : "Hidden from Portfolio";
    } else if (tabName === "about") {
        document.getElementById("about-detailed-desc").textContent = project.detailedDescription || project.shortDescription || "No description provided.";
    } else if (tabName === "tech") {
        const list = document.getElementById("tech-stack-list");
        if (list) {
            const techs = parseTags(project.technologies);
            if (techs.length === 0) {
                list.innerHTML = `<span class="muted-label">No technologies listed</span>`;
            } else {
                list.innerHTML = techs.map(t => `<span class="tech-chip-redesigned">${escapeHtml(t)}</span>`).join("");
            }
        }
    } else if (tabName === "features") {
        const list = document.getElementById("features-list");
        if (list) {
            const desc = project.detailedDescription || "";
            const bulletLines = desc.split("\n")
                .map(line => line.trim())
                .filter(line => line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+\./.test(line));
            
            if (bulletLines.length === 0) {
                const sentences = desc.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
                if (sentences.length === 0) {
                    list.innerHTML = `<li>No features documented yet.</li>`;
                } else {
                    list.innerHTML = sentences.slice(0, 5).map(s => `<li>${escapeHtml(s)}.</li>`).join("");
                }
            } else {
                list.innerHTML = bulletLines.map(line => {
                    const cleanLine = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "");
                    return `<li>${escapeHtml(cleanLine)}</li>`;
                }).join("");
            }
        }
    } else if (tabName === "gallery") {
        const container = document.getElementById("gallery-image-wrapper");
        if (container) {
            const imgUrl = project.imageFile?.downloadUrl || project.imageUrl;
            if (imgUrl) {
                const urls = imgUrl.split(",").map(u => u.trim()).filter(Boolean);
                if (urls.length > 1) {
                    container.innerHTML = `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">
                            ${urls.map((url, idx) => `
                                <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border); padding-top: 56.25%; position: relative;">
                                    <img src="${url}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;" alt="${escapeHtml(project.title)} Screenshot ${idx + 1}">
                                </div>
                            `).join("")}
                        </div>`;
                } else {
                    container.innerHTML = `<img src="${urls[0]}" alt="${escapeHtml(project.title)} Project Screenshot">`;
                }
            } else {
                container.innerHTML = `<div class="gallery-no-image"><i class="fa-regular fa-image fa-3x"></i><p>No project image uploaded yet.</p></div>`;
            }
        }
    } else if (tabName === "notes") {
        // Handled by refreshRedesignedNotes()
    } else if (tabName === "timeline") {
        const container = document.getElementById("panel-timeline-content") || document.getElementById("panel-timeline");
        if (container) {
            const timelineNotes = [...notes].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            
            if (timelineNotes.length === 0) {
                container.innerHTML = `<div class="about-content-box"><h3>Timeline History</h3>${emptyMarkup("No activity logged yet.")}</div>`;
            } else {
                const timelineItems = timelineNotes.map(note => {
                    const statusClass = (note.type || "PENDING").toLowerCase().replace("_", "-");
                    const dateStr = formatTimestamp(note.createdAt);
                    return `
                        <div class="timeline-item">
                            <div class="timeline-dot dot-${statusClass}"></div>
                            <div class="timeline-content">
                                <div class="timeline-header-row">
                                    <h4>${escapeHtml(note.title)}</h4>
                                    <span class="timeline-time">${dateStr}</span>
                                </div>
                                <p class="timeline-desc">${escapeHtml(note.content)}</p>
                            </div>
                        </div>
                    `;
                }).join("");
                
                container.innerHTML = `
                    <div class="about-content-box">
                        <h3>Timeline History</h3>
                        <div class="timeline-list">
                            ${timelineItems}
                        </div>
                    </div>
                `;
            }
        }
    } else if (tabName === "count") {
        renderProjectNoteCounts(notes);
    }
}

function closeProjectNotes() {
    const modal = document.getElementById("project-notes-modal");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.currentProject = null;
    state.currentProjectNotes = [];
    state.editingProjectNoteId = null;
}

async function initProjectNotesPage() {
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    const hero = document.getElementById("project-notes-page-hero");
    const tabs = document.getElementById("project-notes-page-tabs");
    const summary = document.getElementById("project-notes-page-summary");
    const list = document.getElementById("project-notes-page-list");
    const form = document.getElementById("project-notes-page-form");
    if (!projectId) {
        document.querySelector(".project-notes-workspace")?.classList.add("is-hidden");
        const projectsResponse = await projectsApi.getAdmin({ page: 0, size: 50, sortBy: "createdAt", sortDirection: "DESC" });
        const projects = projectsResponse.data?.content || [];
        hero.innerHTML = `
            <div class="project-notes-hero">
                <div class="project-notes-hero-main">
                    <div class="project-notes-avatar">
                        <span class="project-notes-avatar-initials">P</span>
                    </div>
                    <div class="project-notes-hero-copy">
                        <p class="eyebrow">Project Notes</p>
                        <h2>Select a project</h2>
                        <p>Choose a project to inspect, filter, and edit the full note history.</p>
                        <div class="chip-row project-notes-meta-row">
                            <span class="chip">${projects.length} loaded</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="field-grid">
                <label>
                    <span>Project</span>
                    <select id="project-notes-project-picker" class="input">
                        ${projects.map((project) => `<option value="${project.id}">${escapeHtml(project.title || `Project ${project.id}`)}</option>`).join("")}
                    </select>
                </label>
            </div>
            <div class="table-actions">
                <button id="project-notes-project-open" class="button button-primary" type="button">Open notes</button>
            </div>
        `;
        summary.innerHTML = emptyMarkup("No project selected.");
        list.innerHTML = emptyMarkup("No notes to show.");
        document.getElementById("project-notes-project-open")?.addEventListener("click", () => {
            const selectedId = document.getElementById("project-notes-project-picker")?.value;
            if (selectedId) {
                window.location.href = `/api/v1/admin/project-notes.html?projectId=${selectedId}`;
            }
        });
        return;
    }

    document.querySelector(".project-notes-workspace")?.classList.remove("is-hidden");
    const projectResponse = await projectsApi.getAdminById(projectId);
    state.currentProject = projectResponse.data;
    const renderProjectNotesHero = (noteCount = state.currentProjectNotes.length) => {
        const project = state.currentProject || {};
        const mediaUrl = (project.imageFile?.downloadUrl || project.imageUrl || "").split(",")[0].trim();
        const techCount = parseTags(project.technologies).length;
        const statusOptions = PROJECT_STATUSES.map((status) => {
            const selected = status === (project.status || PROJECT_STATUSES[0]) ? " selected" : "";
            return `<option value="${status}"${selected}>${formatEnumLabel(status)}</option>`;
        }).join("");
        hero.innerHTML = `
            <div class="project-notes-hero">
                <div class="project-notes-hero-main">
                    <div class="project-notes-avatar ${mediaUrl ? "has-image" : ""}">
                        ${mediaUrl
                            ? `<img class="project-notes-avatar-image" src="${mediaUrl}" alt="${escapeHtml(project.title || "Project")}" loading="lazy">`
                            : `<span class="project-notes-avatar-initials">${escapeHtml(getInitials(project.title || "Project"))}</span>`}
                    </div>
                    <div class="project-notes-hero-copy">
                        <p class="eyebrow">Project Notes</p>
                        <h2>${escapeHtml(project.title || "Project")}</h2>
                        <p>${escapeHtml(project.shortDescription || "Capture every milestone, implementation note, and release decision in one place.")}</p>
                        <div class="chip-row project-notes-meta-row">
                            <span class="chip ${formatProjectStatusTone(project)}">${escapeHtml(formatProjectStatus(project.status || "PLANNED"))}</span>
                            <span class="chip">${noteCount} note${noteCount === 1 ? "" : "s"}</span>
                            <span class="chip">${techCount} tech${techCount === 1 ? "" : "s"}</span>
                            ${project.displayed === false ? '<span class="chip">Hidden</span>' : '<span class="chip">Displayed</span>'}
                        </div>
                    </div>
                </div>
                <div class="project-status-block select-wrapper">
                    <span class="status-label">Project Status</span>
                    <select id="project-notes-status-select" class="project-status-select">
                        ${statusOptions}
                    </select>
                </div>
            </div>
        `;
    };

    const renderProjectTabs = () => {
        if (!tabs) {
            return;
        }
        tabs.innerHTML = `
            <nav class="project-notes-tabs" aria-label="Project sections">
                ${[
                    ["overview", "Overview"],
                    ["about", "About Project"],
                    ["tech", "Tech Stack"],
                    ["features", "Features"],
                    ["gallery", "Gallery"],
                    ["notes", "Notes", true],
                    ["timeline", "Timeline"],
                    ["count", "Count"]
                ].map(([key, label, active]) => `<button class="tab-btn ${active ? "active" : ""}" type="button" data-tab="${key}">${label}</button>`).join("")}
            </nav>
        `;
    };

    const switchProjectNotesPageTab = (tabName) => {
        const tabBar = document.getElementById("project-notes-page-tabs");
        const panelRoot = document.getElementById("project-notes-page-tab-panels");
        if (!tabBar || !panelRoot) {
            return;
        }
        tabBar.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tabName);
        });
        panelRoot.querySelectorAll(".tab-panel").forEach((panel) => {
            panel.classList.toggle("hidden", panel.id !== `panel-${tabName}`);
        });
        renderTabPanelContent(tabName);
        panelRoot.querySelector(`#panel-${tabName}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    renderProjectNotesHero();
    renderProjectTabs();
    ["overview", "about", "tech", "features", "gallery", "timeline", "count"].forEach((tabName) => renderTabPanelContent(tabName));
    switchProjectNotesPageTab("notes");
    document.getElementById("project-notes-count-button")?.addEventListener("click", () => {
        switchProjectNotesPageTab("count");
        window.setTimeout(() => {
            document.getElementById("notes-count-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
    });
    document.getElementById("project-notes-status-select")?.addEventListener("change", async (event) => {
        if (!state.currentProject) {
            return;
        }
        const newStatus = event.target.value;
        try {
            const payload = {
                ...state.currentProject,
                status: newStatus
            };
            if (state.currentProject.imageFile) {
                payload.imageFileId = state.currentProject.imageFile.id;
            }
            await projectsApi.update(state.currentProject.id, payload);
            state.currentProject.status = newStatus;
            renderProjectNotesHero();
            await loadProjectsAdmin();
        } catch (error) {
            alert("Failed to update project status: " + error.message);
            event.target.value = state.currentProject.status;
        }
    });
    const backLink = document.getElementById("project-notes-back");
    if (backLink) {
        backLink.href = "/api/v1/admin/projects.html";
        backLink.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "/api/v1/admin/projects.html";
        });
    }

    renderProjectNoteForm(null, "project-notes-page-form");
    bindProjectNoteComposer("project-notes-page-form", async () => {
        await loadProjectNotesArchive();
    });

    const statusFilters = document.getElementById("notes-status-filters");
    statusFilters.innerHTML = [
        ["ALL", "All Notes", "violet"],
        ["PENDING", "Pending", "amber"],
        ["IN_PROGRESS", "In Progress", "blue"],
        ["REVIEW", "Review", "violet"],
        ["COMPLETED", "Completed", "green"]
    ].map(([value, label, tone], index) => `<button class="filter-pill ${index === 0 ? "active" : ""}" type="button" data-filter="${value}"><span class="dot dot-${value.toLowerCase().replaceAll("_", "-")}"></span>${label}</button>`).join("");
    statusFilters.addEventListener("click", (event) => {
        const button = event.target.closest(".filter-pill");
        if (!button) {
            return;
        }
        statusFilters.querySelectorAll(".filter-pill").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        notesFilter = button.getAttribute("data-filter");
        loadProjectNotesArchive();
    });

    const sortSelect = document.getElementById("notes-sort-select");
    sortSelect.value = notesSort;
    sortSelect.addEventListener("change", (event) => {
        notesSort = event.target.value;
        loadProjectNotesArchive();
    });

    document.getElementById("project-notes-add-btn")?.addEventListener("click", () => {
        const titleField = document.querySelector("#project-notes-page-form [name='title']");
        titleField?.focus();
        titleField?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    tabs?.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            switchProjectNotesPageTab(btn.dataset.tab || "notes");
        });
    });

    async function loadProjectNotesArchive() {
        list.innerHTML = `<div class="notes-loading">Loading notes...</div>`;
        try {
            const notes = await fetchProjectNotes(projectId);
            state.currentProjectNotes = notes;
            renderProjectNotesHero(notes.length);
            ["overview", "about", "tech", "features", "gallery", "timeline", "count"].forEach((tabName) => renderTabPanelContent(tabName));
            switchProjectNotesPageTab(tabs?.querySelector(".tab-btn.active")?.dataset.tab || "notes");
            renderProjectNotesList(notes, {
                containerId: "project-notes-page-list",
                formId: "project-notes-page-form",
                pageMode: true,
                showActions: true,
                emptyMessage: notes.length ? "No notes match the selected filters." : "No notes recorded yet. Add the first one to begin your archive."
            });
        } catch (error) {
            list.innerHTML = emptyMarkup("Unable to load notes archive.");
        }
    }

    await loadProjectNotesArchive();
}

async function loadProjectsAdmin() {
    const visibility = document.getElementById("admin-project-visibility")?.value || "";
    const displayedFilter = visibility === "displayed" ? true : visibility === "hidden" ? false : "";
    const summaryResponse = await projectsApi.getAdmin({
        page: 0,
        size: 5000,
        search: "",
        category: "",
        status: "",
        displayed: displayedFilter
    });
    const summaryData = summaryResponse.data || {};
    const allProjects = safeArray(summaryData.content);
    state.projectsCache = allProjects;

    const counts = {
        total: Number(summaryData.totalElements || allProjects.length || 0),
        inProgress: allProjects.filter((project) => project.status === "IN_PROGRESS").length,
        completed: allProjects.filter((project) => project.status === "COMPLETED").length,
        planned: allProjects.filter((project) => project.status === "PLANNED").length,
        archived: allProjects.filter((project) => project.status === "ARCHIVED").length,
        hidden: allProjects.filter((project) => project.displayed === false).length
    };
    const metricsContainer = document.getElementById("admin-project-metrics");
    if (metricsContainer) {
        metricsContainer.innerHTML = [
            projectMetricCardMarkup("Total projects", counts.total, "All time", "fa-solid fa-briefcase", "violet"),
            projectMetricCardMarkup("In progress", counts.inProgress, `${counts.total ? Math.round((counts.inProgress / counts.total) * 100) : 0}% of total`, "fa-solid fa-spinner", "blue"),
            projectMetricCardMarkup("Completed", counts.completed, `${counts.total ? Math.round((counts.completed / counts.total) * 100) : 0}% of total`, "fa-regular fa-circle-check", "green"),
            projectMetricCardMarkup("On hold", counts.planned, `${counts.total ? Math.round((counts.planned / counts.total) * 100) : 0}% of total`, "fa-regular fa-clock", "amber"),
            projectMetricCardMarkup("Archived", counts.archived || counts.hidden, `${counts.archived || counts.hidden} items`, "fa-solid fa-box-archive", "slate")
        ].join("");
    }
    syncProjectHiddenToggle(visibility, counts.hidden);

    const searchText = normalizeValue(document.getElementById("admin-project-search")?.value).toLowerCase();
    const selectedCategory = normalizeValue(document.getElementById("admin-project-category")?.value);
    const selectedStatus = normalizeValue(document.getElementById("admin-project-status")?.value);
    const projectYearFilter = document.getElementById("admin-project-year-filter");
    const selectedYear = state.projectYearFilter || projectYearFilter?.value || "";
    if (projectYearFilter) {
        const years = [...new Set(allProjects.map(getProjectYear).filter(Boolean))].sort((left, right) => Number(right) - Number(left));
        if (selectedYear && !years.includes(selectedYear)) {
            years.unshift(selectedYear);
        }
        projectYearFilter.innerHTML = [`<option value="">All years</option>`, ...years.map((year) => `<option value="${year}">${year}</option>`)].join("");
        projectYearFilter.value = selectedYear;
    }

    const filteredProjects = allProjects.filter((project) => {
        const haystack = [
            project.title,
            project.shortDescription,
            project.detailedDescription,
            project.technologies,
            project.category,
            project.status
        ].join(" ").toLowerCase();
        const matchesSearch = !searchText || haystack.includes(searchText);
        const matchesCategory = !selectedCategory || project.category === selectedCategory;
        const matchesStatus = !selectedStatus || project.status === selectedStatus;
        const matchesVisibility = !visibility
            || (visibility === "displayed" && project.displayed !== false)
            || (visibility === "hidden" && project.displayed === false);
        const matchesYear = !selectedYear || getProjectYear(project) === selectedYear;
        return matchesSearch && matchesCategory && matchesStatus && matchesVisibility && matchesYear;
    });

    const totalProjects = filteredProjects.length;
    const totalPages = Math.max(Math.ceil(totalProjects / state.projectSize), 1);
    if (state.projectPage > totalPages - 1) {
        state.projectPage = totalPages - 1;
    }
    const startIndex = state.projectPage * state.projectSize;
    const endIndex = startIndex + state.projectSize;
    const projects = filteredProjects.slice(startIndex, endIndex);
    const list = document.getElementById("admin-project-list");
    list.classList.toggle("is-list-view", state.projectViewMode === "list");
    list.classList.toggle("has-empty-state", !projects.length);
    list.innerHTML = projects.map((project, index) => projectCardMarkup(project, index)).join("") || emptyMarkup("No projects found.");
    renderProjectCompareTray();

    const startItem = totalProjects ? startIndex + 1 : 0;
    const endItem = totalProjects ? Math.min(endIndex, totalProjects) : 0;
    document.getElementById("admin-project-page-label").textContent = `Showing ${startItem} to ${endItem} of ${totalProjects} projects`;
    document.getElementById("admin-project-prev").disabled = state.projectPage <= 0;
    document.getElementById("admin-project-next").disabled = state.projectPage >= totalPages - 1;

    projects.forEach((project) => {
        const starButton = document.querySelector(`[data-project-star="${project.id}"]`);
        const compareButton = document.querySelector(`[data-project-compare="${project.id}"]`);
        const menuButton = document.querySelector(`[data-project-menu-open="${project.id}"]`);
        const menuWrap = menuButton?.closest(".project-card-menu-wrap");
        const menuPanel = document.querySelector(`[data-project-card-menu="${project.id}"]`);
        const detailsButton = menuPanel?.querySelector(`[data-project-details="${project.id}"]`);
        const duplicateButton = menuPanel?.querySelector(`[data-project-duplicate="${project.id}"]`);
        const toggleFeaturedButton = menuPanel?.querySelector(`[data-project-toggle-featured="${project.id}"]`);
        const toggleArchiveButton = menuPanel?.querySelector(`[data-project-toggle-archive="${project.id}"]`);
        const toggleVisibilityButton = menuPanel?.querySelector(`[data-project-toggle-visibility="${project.id}"]`);
        const copyLinkButton = menuPanel?.querySelector(`[data-project-copy-link="${project.id}"]`);
        const notesButton = menuPanel?.querySelector(`[data-project-notes-open="${project.id}"]`);
        const deleteButton = menuPanel?.querySelector(`[data-project-delete="${project.id}"]`);

        syncProjectCardToggle(
            starButton,
            isStarredProject(project.id),
            "Unstar project",
            "Star project"
        );
        syncProjectCardToggle(
            compareButton,
            isComparedProject(project.id),
            "Remove from compare",
            "Add to compare"
        );

        starButton?.addEventListener("click", async () => {
            toggleStarProject(project.id);
            syncProjectCardToggle(
                starButton,
                isStarredProject(project.id),
                "Unstar project",
                "Star project"
            );
            animateProjectToggle(starButton, isStarredProject(project.id));
        });

        compareButton?.addEventListener("click", async () => {
            const changed = toggleCompareProject(project.id);
            if (!changed) {
                return;
            }
            syncProjectCardToggle(
                compareButton,
                isComparedProject(project.id),
                "Remove from compare",
                "Add to compare"
            );
            animateProjectToggle(compareButton, isComparedProject(project.id));
            renderProjectCompareTray();
        });

        detailsButton?.addEventListener("click", () => {
            closeProjectMenus();
            openProjectDetail(project);
        });

        menuButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            const willOpen = !menuWrap?.classList.contains("is-open");
            closeProjectMenus(menuButton);
            menuWrap?.classList.toggle("is-open", willOpen);
            menuButton.setAttribute("aria-expanded", String(willOpen));
        });


        menuPanel?.querySelector(`[data-project-edit="${project.id}"]`)?.addEventListener("click", () => {
            state.editingProjectId = project.id;
            state.currentProject = project;
            openProjectEditor();
            fillForm(document.getElementById("project-form"), project);
            document.getElementById("project-imageUrl-field")?.dispatchEvent(new Event("input"));
        });

        duplicateButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await duplicateProject(project);
        });
        toggleFeaturedButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await toggleProjectFeatured(project);
        });
        toggleArchiveButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await toggleProjectArchive(project);
        });
        toggleVisibilityButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await toggleProjectVisibility(project);
        });
        copyLinkButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await openProjectLink(project);
        });
        notesButton?.addEventListener("click", () => {
            closeProjectMenus();
            window.location.href = `/api/v1/admin/project-notes.html?projectId=${project.id}`;
        });
        deleteButton?.addEventListener("click", async () => {
            closeProjectMenus();
            await handleProjectDelete(project);
        });

        document.querySelector(`[data-project-view="${project.id}"]`)?.addEventListener("click", () => {
            openProjectDetail(project);
        });
        document.querySelectorAll(`[data-project-notes-open="${project.id}"]`).forEach((button) => {
            button.addEventListener("click", () => {
                closeProjectMenus();
                window.location.href = `/api/v1/admin/project-notes.html?projectId=${project.id}`;
            });
        });
    });
}

function bindProjectForm() {
    const form = document.getElementById("project-form");
    if (!form) return;

    // Wizard Navigation Logic
    let currentStep = 1;
    const steps = form.querySelectorAll(".project-wizard-step");
    const panes = form.querySelectorAll(".project-wizard-pane");
    const prevBtn = form.querySelector("#project-wizard-prev");
    const nextBtn = form.querySelector("#project-wizard-next");
    const submitBtn = form.querySelector("#project-wizard-submit");

    function goToStep(stepNum) {
        if (stepNum < 1 || stepNum > 4) return;
        currentStep = stepNum;

        steps.forEach((s) => {
            const val = parseInt(s.dataset.step);
            s.classList.toggle("active", val === currentStep);
            s.style.color = val === currentStep ? "var(--accent)" : "var(--muted)";
            s.style.fontWeight = val === currentStep ? "700" : "500";
        });

        panes.forEach((p) => {
            p.style.display = parseInt(p.dataset.pane) === currentStep ? "block" : "none";
        });

        prevBtn.style.visibility = currentStep === 1 ? "hidden" : "visible";
        if (currentStep === 4) {
            nextBtn.style.display = "none";
            submitBtn.style.display = "inline-flex";
        } else {
            nextBtn.style.display = "inline-flex";
            submitBtn.style.display = "none";
        }
    }

    nextBtn?.addEventListener("click", () => {
        const activePane = form.querySelector(`.project-wizard-pane[data-pane="${currentStep}"]`);
        const invalid = activePane.querySelector("input:invalid, textarea:invalid");
        if (invalid) {
            invalid.reportValidity();
            return;
        }
        goToStep(currentStep + 1);
    });

    prevBtn?.addEventListener("click", () => {
        goToStep(currentStep - 1);
    });

    steps.forEach((s) => {
        s.addEventListener("click", () => {
            const stepNum = parseInt(s.dataset.step);
            if (stepNum < currentStep) {
                goToStep(stepNum);
            } else {
                for (let i = currentStep; i < stepNum; i++) {
                    const activePane = form.querySelector(`.project-wizard-pane[data-pane="${i}"]`);
                    const invalid = activePane.querySelector("input:invalid, textarea:invalid");
                    if (invalid) {
                        goToStep(i);
                        invalid.reportValidity();
                        return;
                    }
                }
                goToStep(stepNum);
            }
        });
    });

    // Multi-Image Upload & Preview Logic
    const dragDrop = form.querySelector("#project-drag-drop");
    const fileInput = form.querySelector("#project-files-input");
    const uploadStatus = form.querySelector("#project-upload-status");
    const imgField = form.querySelector("#project-imageUrl-field");
    const previewGrid = form.querySelector("#project-images-preview-grid");
    let projectImages = [];

    function renderImagesPreview() {
        if (!previewGrid) return;
        projectImages = imgField.value.split(",").map(url => url.trim()).filter(Boolean);
        previewGrid.innerHTML = projectImages.map((url, idx) => `
            <div class="project-img-preview-card" style="position: relative; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; background: var(--surface-soft); padding-top: 56.25%;">
                <img src="${url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" alt="Project Image ${idx + 1}">
                <button class="project-img-delete-btn" data-index="${idx}" type="button" style="position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(239, 68, 68, 0.9); color: white; display: grid; place-items: center; cursor: pointer; transition: background 0.2s ease;" aria-label="Delete image">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.75rem;"></i>
                </button>
            </div>
        `).join("");

        previewGrid.querySelectorAll(".project-img-delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                projectImages.splice(idx, 1);
                imgField.value = projectImages.join(", ");
                renderImagesPreview();
            });
        });
    }

    imgField?.addEventListener("input", renderImagesPreview);

    dragDrop?.addEventListener("click", () => fileInput?.click());

    dragDrop?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragDrop.style.borderColor = "var(--accent)";
        dragDrop.style.background = "rgba(var(--accent-rgb), 0.04)";
    });

    ["dragleave", "drop"].forEach((type) => {
        dragDrop?.addEventListener(type, () => {
            if (dragDrop) {
                dragDrop.style.borderColor = "rgba(var(--accent-rgb), 0.25)";
                dragDrop.style.background = "rgba(var(--accent-rgb), 0.01)";
            }
        });
    });

    dragDrop?.addEventListener("drop", async (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length) {
            await handleProjectImagesUpload(files);
        }
    });

    fileInput?.addEventListener("change", async () => {
        if (fileInput.files.length) {
            await handleProjectImagesUpload(fileInput.files);
        }
    });

    async function handleProjectImagesUpload(files) {
        if (!uploadStatus) return;
        uploadStatus.style.display = "block";
        uploadStatus.style.color = "var(--accent)";
        uploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i>Uploading image(s)... (0/${files.length})`;

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/")) continue;
            try {
                const response = await filesApi.upload(file, "PROJECT_IMAGE");
                projectImages.push(response.data.downloadUrl);
                successCount++;
                uploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i>Uploading image(s)... (${successCount}/${files.length})`;
            } catch (err) {
                console.error("Image upload failed:", err);
            }
        }

        imgField.value = projectImages.join(", ");
        renderImagesPreview();

        uploadStatus.style.color = "#10b981";
        uploadStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Uploaded ${successCount} image(s) successfully!`;
        setTimeout(() => {
            uploadStatus.style.display = "none";
        }, 3000);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            const isEditing = Boolean(state.editingProjectId);
            const confirmLabel = isEditing
                ? `Update "${normalizeValue(fd.get("title")) || state.currentProject?.title || "this project"}"?`
                : `Create "${normalizeValue(fd.get("title")) || "this project"}"?`;
            if (!confirmDanger(confirmLabel)) {
                return;
            }
            const payload = {
                title: fd.get("title"),
                shortDescription: fd.get("shortDescription"),
                detailedDescription: fd.get("detailedDescription"),
                technologies: fd.get("technologies"),
                githubUrl: fd.get("githubUrl"),
                liveUrl: fd.get("liveUrl"),
                imageUrl: fd.get("imageUrl"),
                category: fd.get("category"),
                status: fd.get("status"),
                featured: fd.get("featured") === "on",
                displayed: fd.get("displayed") === "on",
                completionDate: fd.get("completionDate") || null
            };
            if (isEditing) {
                await projectsApi.update(state.editingProjectId, payload);
            } else {
                await projectsApi.create(payload);
            }
            closeProjectEditor();
            await loadProjectsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });

    // Wire cancel button
    form.querySelector("#project-wizard-prev")?.addEventListener("click", () => {}); // handled above
}

async function initProjects() {
    document.getElementById("add-project-btn").addEventListener("click", () => {
        state.editingProjectId = null;
        state.currentProject = null;
        openProjectEditor();
    });
    const modal = document.getElementById("project-editor-modal");
    document.getElementById("project-modal-close").addEventListener("click", closeProjectEditor);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeProjectEditor();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeProjectEditor();
        }
    });

    const notesModal = document.getElementById("project-notes-modal");
    document.getElementById("project-notes-back-btn")?.addEventListener("click", closeProjectNotes);
    notesModal?.addEventListener("click", (event) => {
        if (event.target === notesModal) {
            closeProjectNotes();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && notesModal && !notesModal.classList.contains("hidden")) {
            closeProjectNotes();
        }
    });

    // Bind Tab Click Handlers
    notesModal?.querySelectorAll(".project-notes-tabs .tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");
            if (tabName) {
                switchNotesTab(tabName);
            }
        });
    });

    // Add Note button click
    document.getElementById("project-notes-add-btn")?.addEventListener("click", () => {
        const titleField = document.getElementById("quick-note-title");
        titleField?.focus();
        titleField?.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    // Status Filters
    const filterContainer = document.getElementById("notes-status-filters");
    filterContainer?.addEventListener("click", (event) => {
        const button = event.target.closest(".filter-pill");
        if (!button) return;
        
        filterContainer.querySelectorAll(".filter-pill").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        
        notesFilter = button.getAttribute("data-filter");
        renderRedesignedNotesList();
    });

    // Sort Selector
    document.getElementById("notes-sort-select")?.addEventListener("change", (event) => {
        notesSort = event.target.value;
        renderRedesignedNotesList();
    });

    // Project Status Selector in Header
    document.getElementById("project-notes-status-select")?.addEventListener("change", async (event) => {
        if (!state.currentProject) return;
        const newStatus = event.target.value;
        try {
            const payload = {
                ...state.currentProject,
                status: newStatus
            };
            if (state.currentProject.imageFile) {
                payload.imageFileId = state.currentProject.imageFile.id;
            }
            await projectsApi.update(state.currentProject.id, payload);
            state.currentProject.status = newStatus;
            await loadProjectsAdmin();
        } catch (error) {
            alert("Failed to update project status: " + error.message);
            event.target.value = state.currentProject.status;
        }
    });

    // Quick Add Form Submit
    const quickForm = document.getElementById("project-notes-quick-form");
    quickForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const titleInput = document.getElementById("quick-note-title");
        const contentInput = document.getElementById("quick-note-content");
        const statusSelect = document.getElementById("quick-note-status");
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const status = statusSelect.value;
        
        if (!title || !content) {
            alert("Note title and description are required.");
            return;
        }
        
        try {
            const payload = {
                title,
                content,
                type: status,
                tags: "",
                pinned: false
            };
            
            if (state.editingProjectNoteId) {
                await projectsApi.updateNote(state.currentProject.id, state.editingProjectNoteId, payload);
            } else {
                await projectsApi.createNote(state.currentProject.id, payload);
            }
            
            state.editingProjectNoteId = null;
            quickForm.reset();
            const submitBtn = quickForm.querySelector(".quick-add-btn");
            if (submitBtn) submitBtn.textContent = "Add Note";
            
            await refreshRedesignedNotes();
        } catch (error) {
            alert("Failed to save note: " + error.message);
        }
    });

    document.getElementById("toggle-filters")?.addEventListener("click", () => {
        document.getElementById("admin-project-advanced-filters")?.classList.toggle("is-hidden");
    });

    const viewButtons = [
        { id: "project-view-grid", mode: "grid" },
        { id: "project-view-list", mode: "list" }
    ];
    viewButtons.forEach(({ id, mode }) => {
        document.getElementById(id)?.addEventListener("click", async () => {
            state.projectViewMode = mode;
            viewButtons.forEach(({ id: buttonId, mode: buttonMode }) => {
                const button = document.getElementById(buttonId);
                if (!button) {
                    return;
                }
                const isActive = buttonMode === state.projectViewMode;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });
            await loadProjectsAdmin();
        });
    });
    viewButtons.forEach(({ id, mode }) => {
        const button = document.getElementById(id);
        if (!button) {
            return;
        }
        const isActive = mode === state.projectViewMode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    document.getElementById("admin-project-category").innerHTML = markupOptions(PROJECT_CATEGORIES, true);
    document.getElementById("admin-project-status").innerHTML = markupOptions(PROJECT_STATUSES, true);
    syncProjectStatusPills(document.getElementById("admin-project-status")?.value || "");
    syncProjectHiddenToggle(document.getElementById("admin-project-visibility")?.value || "", state.projectsCache.filter((project) => project.displayed === false).length);
    document.getElementById("admin-project-status-pills")?.addEventListener("click", async (event) => {
        const button = event.target.closest(".filter-pill");
        if (!button) {
            return;
        }
        const statusSelect = document.getElementById("admin-project-status");
        const nextStatus = button.dataset.status || "";
        if (statusSelect) {
            statusSelect.value = nextStatus;
        }
        syncProjectStatusPills(nextStatus);
        state.projectPage = 0;
        await loadProjectsAdmin();
    });
    document.getElementById("admin-project-status")?.addEventListener("change", async (event) => {
        syncProjectStatusPills(event.target.value || "");
    });
    document.getElementById("admin-project-hidden-toggle")?.addEventListener("click", async () => {
        const visibilitySelect = document.getElementById("admin-project-visibility");
        if (!visibilitySelect) {
            return;
        }
        visibilitySelect.value = visibilitySelect.value === "hidden" ? "" : "hidden";
        syncProjectHiddenToggle(visibilitySelect.value, state.projectsCache.filter((project) => project.displayed === false).length);
        state.projectPage = 0;
        await loadProjectsAdmin();
    });
    document.getElementById("admin-project-year-filter")?.addEventListener("change", async (event) => {
        state.projectYearFilter = event.target.value || "";
        state.projectPage = 0;
        await loadProjectsAdmin();
    });
    ["admin-project-search", "admin-project-category", "admin-project-status", "admin-project-visibility"].forEach((id) => {
        document.getElementById(id).addEventListener("input", async () => {
            state.projectPage = 0;
            await loadProjectsAdmin();
        });
        document.getElementById(id).addEventListener("change", async () => {
            state.projectPage = 0;
            await loadProjectsAdmin();
        });
    });
    document.getElementById("admin-project-prev").addEventListener("click", async () => {
        state.projectPage = Math.max(0, state.projectPage - 1);
        await loadProjectsAdmin();
    });
    document.getElementById("admin-project-next").addEventListener("click", async () => {
        state.projectPage += 1;
        await loadProjectsAdmin();
    });
    document.getElementById("project-detail-close").addEventListener("click", closeProjectDetail);
    document.getElementById("project-detail-modal").addEventListener("click", (event) => {
        if (event.target.id === "project-detail-modal") {
            closeProjectDetail();
        }
    });
    document.getElementById("project-compare-close")?.addEventListener("click", closeProjectCompareModal);
    document.getElementById("project-compare-modal")?.addEventListener("click", (event) => {
        if (event.target.id === "project-compare-modal") {
            closeProjectCompareModal();
        }
    });
    document.getElementById("project-delete-close")?.addEventListener("click", closeProjectDeleteModal);
    document.getElementById("project-delete-cancel")?.addEventListener("click", closeProjectDeleteModal);
    document.getElementById("project-delete-modal")?.addEventListener("click", (event) => {
        if (event.target.id === "project-delete-modal") {
            closeProjectDeleteModal();
        }
    });
    document.getElementById("project-delete-title-input")?.addEventListener("input", syncProjectDeleteModal);
    document.getElementById("project-delete-token-input")?.addEventListener("input", syncProjectDeleteModal);
    document.getElementById("project-delete-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const project = state.projectDeleteTarget;
        const titleInput = document.getElementById("project-delete-title-input");
        const tokenInput = document.getElementById("project-delete-token-input");
        if (!project || !titleInput || !tokenInput) {
            return;
        }
        const requirements = getProjectDeleteRequirements(project);
        const titleMatches = normalizeValue(titleInput.value) === requirements.title;
        const tokenMatches = normalizeValue(tokenInput.value).toUpperCase() === requirements.token;
        if (!titleMatches || !tokenMatches) {
            alert("Type the exact project title and DELETE to confirm.");
            return;
        }
        try {
            await projectsApi.remove(project.id);
            closeProjectDeleteModal();
            state.projectPage = 0;
            await loadProjectsAdmin();
        } catch (error) {
            alert("Failed to delete project: " + error.message);
        }
    });
    document.addEventListener("keydown", (event) => {
        const detailModal = document.getElementById("project-detail-modal");
        if (event.key === "Escape" && detailModal && !detailModal.classList.contains("hidden")) {
            closeProjectDetail();
        }
        const compareModal = document.getElementById("project-compare-modal");
        if (event.key === "Escape" && compareModal && !compareModal.classList.contains("hidden")) {
            closeProjectCompareModal();
        }
        const deleteModal = document.getElementById("project-delete-modal");
        if (event.key === "Escape" && deleteModal && !deleteModal.classList.contains("hidden")) {
            closeProjectDeleteModal();
        }
    });
    document.addEventListener("click", async (event) => {
        if (!event.target.closest(".project-card-menu-wrap")) {
            closeProjectMenus();
        }
        if (event.target.closest("#project-compare-open")) {
            openProjectCompareModal();
        }
        if (event.target.closest("#project-compare-cancel")) {
            state.comparedProjects = [];
            writeStoredArray("compared_projects", []);
            await loadProjectsAdmin();
        }
    });
    await loadProjectsAdmin();
}

function renderSkillForm() {
    const form = document.getElementById("skill-form");
    if (!form) return;
    form.innerHTML = `
        <div class="field-grid">
            <label><span>Skill name</span><input class="input" name="skillName" required maxlength="100" placeholder="e.g. Java"></label>
            <label><span>Category</span><select class="input" name="category">${markupOptions(SKILL_CATEGORIES)}</select></label>
        </div>
        <div class="field-grid">
            <label><span>Proficiency percentage</span><input class="input" type="number" name="proficiencyPercentage" min="0" max="100" required></label>
            <div>
                <span>Visibility</span>
                <p class="form-help" style="margin:10px 0 0;">Skills are ordered automatically and published in the selected visibility mode.</p>
            </div>
        </div>
        <label><span><input type="checkbox" name="displayed" checked> Display in portfolio</span></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-check" style="margin-right:6px;"></i>${state.editingSkillId ? "Update" : "Create"}</button>
            <button id="skill-reset" class="button button-ghost" type="button">Cancel</button>
        </div>
    `;
}

function openSkillEditor() {
    renderSkillForm();
    bindSkillForm();
    const modal = document.getElementById("skill-editor-modal");
    document.getElementById("skill-modal-title").textContent = state.editingSkillId ? "Edit skill" : "New skill";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modal.querySelector(".input")?.focus();
}

function closeSkillEditor() {
    const modal = document.getElementById("skill-editor-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.editingSkillId = null;
}

function bindSkillForm() {
    const form = document.getElementById("skill-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const isEditing = Boolean(state.editingSkillId);
            payload.skillName = normalizeValue(payload.skillName);
            if (!payload.skillName) {
                throw new Error("Skill name is required.");
            }
            const duplicate = state.skillsCache.find((skill) =>
                normalizeKey(skill.skillName) === normalizeKey(payload.skillName) &&
                skill.id !== state.editingSkillId
            );
            if (duplicate) {
                throw new Error("Skill already exists.");
            }
            payload.proficiencyPercentage = Number(payload.proficiencyPercentage);
            payload.displayed = payload.displayed === "on";
            const existingSkill = state.skillsCache.find((skill) => String(skill.id) === String(state.editingSkillId));
            payload.displayOrder = isEditing
                ? Number(existingSkill?.displayOrder ?? 1)
                : (Math.max(0, ...state.skillsCache.map((skill) => Number(skill.displayOrder) || 0)) + 1);
            if (isEditing) {
                await skillsApi.update(state.editingSkillId, payload);
            } else {
                await skillsApi.create(payload);
            }
            closeSkillEditor();
            await refreshSkillsCache();
            await loadSkillsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });
    document.getElementById("skill-reset").addEventListener("click", () => {
        closeSkillEditor();
    });
}

function getSortedSkillsCache() {
    return [...state.skillsCache].sort((left, right) => {
        const leftOrder = Number(left.displayOrder) || 0;
        const rightOrder = Number(right.displayOrder) || 0;
        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }
        return (left.skillName || "").localeCompare(right.skillName || "");
    });
}

function buildSkillPayload(skill, overrides = {}) {
    return {
        skillName: skill.skillName,
        category: skill.category,
        proficiencyPercentage: Number(skill.proficiencyPercentage) || 0,
        displayOrder: Number(skill.displayOrder) || 0,
        displayed: skill.displayed !== false,
        ...overrides
    };
}

async function refreshSkillsView() {
    await refreshSkillsCache();
    await loadSkillsAdmin();
}

async function toggleSkillVisibility(skill) {
    await skillsApi.update(skill.id, buildSkillPayload(skill, { displayed: !(skill.displayed !== false) }));
    await refreshSkillsView();
}

async function moveSkillByOffset(skill, offset) {
    const orderedSkills = getSortedSkillsCache();
    const currentIndex = orderedSkills.findIndex((item) => String(item.id) === String(skill.id));
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedSkills.length) {
        return;
    }
    const currentSkill = orderedSkills[currentIndex];
    const targetSkill = orderedSkills[targetIndex];
    await Promise.all([
        skillsApi.update(currentSkill.id, buildSkillPayload(currentSkill, { displayOrder: Number(targetSkill.displayOrder) || 0 })),
        skillsApi.update(targetSkill.id, buildSkillPayload(targetSkill, { displayOrder: Number(currentSkill.displayOrder) || 0 }))
    ]);
    await refreshSkillsView();
}

async function copySkillName(skill) {
    const skillName = skill.skillName || "";
    if (!skillName) {
        return;
    }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(skillName);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = skillName;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }
        alert(`Copied "${skillName}"`);
    } catch {
        alert(skillName);
    }
}

function closeSkillMenus(exceptButton = null) {
    document.querySelectorAll("[data-skill-menu-open]").forEach((button) => {
        if (button !== exceptButton) {
            button.closest(".skill-card-menu-wrap")?.classList.remove("is-open");
            button.setAttribute("aria-expanded", "false");
        }
    });
}

async function loadSkillsAdmin() {
    const category = document.getElementById("admin-skill-category").value;
    const response = await skillsApi.listAdmin(category);
    const skills = response.data || [];
    
    const search = normalizeValue(document.getElementById("admin-skill-search")?.value).toLowerCase();
    const visibility = document.getElementById("admin-skill-visibility")?.value || "";
    const proficiency = document.getElementById("admin-skill-proficiency")?.value || "";
    const sort = document.getElementById("admin-skill-sort")?.value || "order";

    // 1. Apply Filtering
    let filtered = skills.filter((skill) => {
        const matchesSearch = !search || (skill.skillName || "").toLowerCase().includes(search);
        
        const isVisible = skill.displayed !== false;
        const matchesVisibility = !visibility
            || (visibility === "displayed" && isVisible)
            || (visibility === "hidden" && !isVisible);

        const prof = Number(skill.proficiencyPercentage) || 0;
        let matchesProficiency = true;
        if (proficiency === "expert") {
            matchesProficiency = prof >= 80;
        } else if (proficiency === "intermediate") {
            matchesProficiency = prof >= 50 && prof < 80;
        } else if (proficiency === "beginner") {
            matchesProficiency = prof < 50;
        }

        return matchesSearch && matchesVisibility && matchesProficiency;
    });

    // 2. Apply Sorting
    filtered.sort((left, right) => {
        if (sort === "name_asc") {
            return (left.skillName || "").localeCompare(right.skillName || "");
        } else if (sort === "name_desc") {
            return (right.skillName || "").localeCompare(left.skillName || "");
        } else if (sort === "proficiency_desc") {
            return (Number(right.proficiencyPercentage) || 0) - (Number(left.proficiencyPercentage) || 0);
        } else if (sort === "proficiency_asc") {
            return (Number(left.proficiencyPercentage) || 0) - (Number(right.proficiencyPercentage) || 0);
        } else {
            // Default Custom Order by displayOrder
            const leftOrder = Number(left.displayOrder) || 0;
            const rightOrder = Number(right.displayOrder) || 0;
            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }
            return (left.skillName || "").localeCompare(right.skillName || "");
        }
    });

    // 3. Render HTML Markup
    document.getElementById("admin-skill-list").innerHTML = filtered.map((skill) => `
        <article class="table-card admin-skill-card" data-skill-card="${skill.id}">
            <header class="skill-card-top">
                <div class="skill-card-badges">
                    <span class="chip skill-card-category">${formatEnumLabel(skill.category || "OTHER")}</span>
                    <span class="chip visibility-badge ${skill.displayed === false ? "is-hidden" : ""}">${skill.displayed === false ? "Hidden" : "Displayed"}</span>
                </div>
                
                <div class="skill-card-menu-wrap">
                    <button class="skill-card-menu-button" data-skill-menu-open="${skill.id}" type="button" aria-label="More options" aria-expanded="false">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="skill-card-menu" data-skill-card-menu="${skill.id}" role="menu" aria-label="Skill actions">
                        <button class="skill-card-menu-item" data-skill-action="edit" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-pen"></i>
                            <span>Edit</span>
                        </button>
                        <button class="skill-card-menu-item" data-skill-action="toggle-visibility" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid ${skill.displayed === false ? "fa-eye" : "fa-eye-slash"}"></i>
                            <span>${skill.displayed === false ? "Show" : "Hide"}</span>
                        </button>
                        <button class="skill-card-menu-item" data-skill-action="move-up" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-arrow-up"></i>
                            <span>Move Up</span>
                        </button>
                        <button class="skill-card-menu-item" data-skill-action="move-down" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-arrow-down"></i>
                            <span>Move Down</span>
                        </button>
                        <button class="skill-card-menu-item" data-skill-action="copy-name" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-copy"></i>
                            <span>Copy Name</span>
                        </button>
                        <div class="skill-card-menu-divider" role="separator"></div>
                        <button class="skill-card-menu-item is-danger" data-skill-action="delete" data-skill-id="${skill.id}" type="button" role="menuitem">
                            <i class="fa-solid fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                    
                    <div class="skill-delete-popover hidden" data-skill-confirmation="${skill.id}">
                        <p>Delete this skill?</p>
                        <div class="skill-delete-popover-actions">
                            <button class="button button-ghost" type="button" data-skill-confirm-cancel="${skill.id}">Cancel</button>
                            <button class="button button-danger" type="button" data-skill-confirm-delete="${skill.id}">Confirm</button>
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="skill-card-copy">
                <strong class="skill-card-name">${skill.skillName}</strong>
            </div>
            
            <div class="skill-card-proficiency-row">
                <span>Proficiency</span>
                <strong>${skill.proficiencyPercentage}%</strong>
            </div>
            <div class="skill-bar-container">
                <div class="skill-progress-bg">
                    <div class="skill-progress-fill" style="width: ${skill.proficiencyPercentage}%;"></div>
                </div>
            </div>
        </article>
    `).join("") || emptyMarkup("No skills found.");

    // 4. Bind Action Listeners
    if (!document.getElementById("admin-skill-list")?.dataset.menuBound) {
        const list = document.getElementById("admin-skill-list");
        if (list) {
            list.dataset.menuBound = "true";
            list.addEventListener("click", async (event) => {
                const openButton = event.target.closest("[data-skill-menu-open]");
                const actionButton = event.target.closest("[data-skill-action]");
                const cancelButton = event.target.closest("[data-skill-confirm-cancel]");
                const confirmButton = event.target.closest("[data-skill-confirm-delete]");

                const hideSkillConfirmations = () => {
                    list.querySelectorAll(".skill-delete-popover").forEach((panel) => panel.classList.add("hidden"));
                };

                if (openButton) {
                    event.stopPropagation();
                    const skillId = openButton.getAttribute("data-skill-menu-open");
                    const menuWrap = openButton.closest(".skill-card-menu-wrap");
                    const willOpen = !menuWrap?.classList.contains("is-open");
                    closeSkillMenus(openButton);
                    menuWrap?.classList.toggle("is-open", willOpen);
                    openButton.setAttribute("aria-expanded", String(willOpen));
                    return;
                }

                if (cancelButton) {
                    event.stopPropagation();
                    hideSkillConfirmations();
                    return;
                }

                if (confirmButton) {
                    event.stopPropagation();
                    const skillId = confirmButton.getAttribute("data-skill-confirm-delete");
                    const skill = state.skillsCache.find((item) => String(item.id) === String(skillId));
                    if (!skill) {
                        return;
                    }
                    try {
                        await skillsApi.remove(skill.id);
                        await refreshSkillsView();
                    } catch (error) {
                        alert("Skill action failed: " + error.message);
                    }
                    hideSkillConfirmations();
                    return;
                }

                if (!actionButton) {
                    return;
                }
                event.stopPropagation();
                const skillId = actionButton.getAttribute("data-skill-id");
                const skill = state.skillsCache.find((item) => String(item.id) === String(skillId));
                if (!skill) {
                    return;
                }
                const action = actionButton.getAttribute("data-skill-action");
                try {
                    closeSkillMenus();
                    if (action === "edit") {
                        state.editingSkillId = skill.id;
                        openSkillEditor();
                        fillForm(document.getElementById("skill-form"), skill);
                        hideSkillConfirmations();
                        return;
                    }
                    if (action === "delete") {
                        hideSkillConfirmations();
                        const confirmationPanel = list.querySelector(`[data-skill-confirmation="${skill.id}"]`);
                        confirmationPanel?.classList.remove("hidden");
                        return;
                    }
                    if (action === "toggle-visibility") {
                        await toggleSkillVisibility(skill);
                        hideSkillConfirmations();
                        return;
                    }
                    if (action === "move-up") {
                        await moveSkillByOffset(skill, -1);
                        hideSkillConfirmations();
                        return;
                    }
                    if (action === "move-down") {
                        await moveSkillByOffset(skill, 1);
                        hideSkillConfirmations();
                        return;
                    }
                    if (action === "copy-name") {
                        await copySkillName(skill);
                        hideSkillConfirmations();
                    }
                } catch (error) {
                    alert("Skill action failed: " + error.message);
                }
            });
        }
    }
}

async function initSkills() {
    document.getElementById("add-skill-btn").addEventListener("click", () => {
        state.editingSkillId = null;
        openSkillEditor();
    });
    const modal = document.getElementById("skill-editor-modal");
    document.getElementById("skill-modal-close").addEventListener("click", closeSkillEditor);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeSkillEditor();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeSkillEditor();
        }
    });
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".skill-card-menu-wrap")) {
            closeSkillMenus();
            document.querySelectorAll(".skill-delete-popover").forEach((panel) => panel.classList.add("hidden"));
        }
    });

    document.getElementById("admin-skill-category").innerHTML = markupOptions(SKILL_CATEGORIES, true);
    
    // Bind search and filter change listeners
    document.getElementById("admin-skill-search")?.addEventListener("input", loadSkillsAdmin);
    document.getElementById("admin-skill-category").addEventListener("change", loadSkillsAdmin);
    document.getElementById("admin-skill-visibility")?.addEventListener("change", loadSkillsAdmin);
    document.getElementById("admin-skill-proficiency")?.addEventListener("change", loadSkillsAdmin);
    document.getElementById("admin-skill-sort")?.addEventListener("change", loadSkillsAdmin);

    await refreshSkillsCache();
    await loadSkillsAdmin();
}

async function refreshSkillsCache() {
    const response = await skillsApi.listAdmin("");
    state.skillsCache = response.data || [];
}

function renderCertificationForm() {
    const form = document.getElementById("certification-form");
    if (!form) return;
    form.innerHTML = `
        <div class="field-grid">
            <label><span>Title</span><input class="input" name="title" required maxlength="150" placeholder="e.g. AWS Certified Developer"></label>
            <label><span>Issuer</span><input class="input" name="issuer" required maxlength="150" placeholder="e.g. Amazon Web Services"></label>
        </div>
        <div class="field-grid">
            <label><span>Issue Date</span><input class="input" type="date" name="issueDate" required></label>
            <label><span>Expiry Date</span><input class="input" type="date" name="expiryDate"></label>
        </div>
        <div class="field-grid">
            <label><span>Credential ID</span><input class="input" name="credentialId" maxlength="150"></label>
            <label><span>Credential URL</span><input class="input" name="credentialUrl" maxlength="250"></label>
        </div>
        <label><span>Certificate file</span><input class="input" type="file" name="certificateFile" accept=".pdf,.doc,.docx,.txt,.rtf"></label>
        <p class="form-help">Accepted file types: PDF, DOC, DOCX, TXT, and RTF.</p>
        <label><span><input type="checkbox" name="displayed" checked> Display in portfolio</span></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-check" style="margin-right:6px;"></i>${state.editingCertificationId ? "Update" : "Create"}</button>
            <button id="certification-reset" class="button button-ghost" type="button">Cancel</button>
        </div>
    `;
}

function openCertificationEditor() {
    renderCertificationForm();
    bindCertificationForm();
    const modal = document.getElementById("certification-editor-modal");
    document.getElementById("certification-modal-title").textContent = state.editingCertificationId ? "Edit certification" : "New certification";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modal.querySelector(".input")?.focus();
}

function closeCertificationEditor() {
    const modal = document.getElementById("certification-editor-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    state.editingCertificationId = null;
    state.currentCertification = null;
}

function bindCertificationForm() {
    const form = document.getElementById("certification-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            const isEditing = Boolean(state.editingCertificationId);
            const title = normalizeValue(fd.get("title"));
            const issuer = normalizeValue(fd.get("issuer"));
            if (!title || !issuer) {
                throw new Error("Title and issuer are required.");
            }
            const duplicate = state.certificationsCache.find((certification) =>
                normalizeKey(certification.title) === normalizeKey(title) &&
                normalizeKey(certification.issuer) === normalizeKey(issuer) &&
                certification.id !== state.editingCertificationId
            );
            if (duplicate) {
                throw new Error("Certification already exists.");
            }
            let certificateFileId = state.currentCertification?.certificateFile?.id ?? null;
            const upload = fd.get("certificateFile");
            if (upload && upload.size) {
                if (!isAllowedDocument(upload)) {
                    throw new Error("Please upload a PDF, DOC, DOCX, TXT, or RTF file.");
                }
                const uploadResponse = await filesApi.upload(upload, "CERTIFICATE");
                certificateFileId = uploadResponse.data.id;
            }
            const payload = {
                title,
                issuer,
                issueDate: fd.get("issueDate"),
                expiryDate: fd.get("expiryDate") || null,
                credentialId: fd.get("credentialId"),
                credentialUrl: fd.get("credentialUrl"),
                certificateFileId,
                displayed: fd.get("displayed") === "on"
            };
            if (isEditing) {
                await certificationsApi.update(state.editingCertificationId, payload);
            } else {
                await certificationsApi.create(payload);
            }
            closeCertificationEditor();
            await loadCertificationsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });
    document.getElementById("certification-reset").addEventListener("click", () => {
        closeCertificationEditor();
    });
}

async function loadCertificationsAdmin() {
    const response = await certificationsApi.listAdmin();
    const certifications = response.data || [];
    state.certificationsCache = certifications;
    renderCertificationControls(certifications);
    renderCertificationsAdmin(certifications);
}

async function initCertifications() {
    document.getElementById("add-cert-btn").addEventListener("click", () => {
        state.editingCertificationId = null;
        state.currentCertification = null;
        openCertificationEditor();
    });
    const modal = document.getElementById("certification-editor-modal");
    document.getElementById("certification-modal-close").addEventListener("click", closeCertificationEditor);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeCertificationEditor();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeCertificationEditor();
        }
    });
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".cert-card-menu-wrap")) {
            closeCertMenus();
            document.querySelectorAll(".cert-delete-popover").forEach((panel) => panel.classList.add("hidden"));
        }
    });

    document.getElementById("certification-controls").addEventListener("input", () => {
        renderCertificationsAdmin(state.certificationsCache);
    });
    document.getElementById("certification-controls").addEventListener("change", () => {
        renderCertificationsAdmin(state.certificationsCache);
    });

    await loadCertificationsAdmin();
}

function renderMessageControls() {
    const container = document.getElementById("message-controls");
    if (!container) {
        return;
    }
    const inboxCount = state.messagesCache.length;
    const starredCount = state.messagesCache.filter((message) => message.starred).length;
    const archivedCount = state.archivedMessagesCache.length;
    const deletedCount = state.deletedMessagesCache.length;
    container.innerHTML = `
        <div class="admin-message-toolbar">
            <div class="admin-message-queues" role="tablist" aria-label="Message queues">
                <button class="message-queue-btn queue-inbox ${state.messageQueue === "inbox" ? "active" : ""}" type="button" data-message-queue="inbox">
                    <i class="fa-solid fa-inbox"></i> Inbox <span>${inboxCount}</span>
                </button>
                <button class="message-queue-btn queue-starred ${state.messageQueue === "starred" ? "active" : ""}" type="button" data-message-queue="starred">
                    <i class="fa-solid fa-star"></i> Starred <span>${starredCount}</span>
                </button>
                <button class="message-queue-btn queue-archived ${state.messageQueue === "archived" ? "active" : ""}" type="button" data-message-queue="archived">
                    <i class="fa-solid fa-box-archive"></i> Archived <span>${archivedCount}</span>
                </button>
                <button class="message-queue-btn queue-deleted ${state.messageQueue === "deleted" ? "active" : ""}" type="button" data-message-queue="deleted">
                    <i class="fa-solid fa-trash"></i> Deleted <span>${deletedCount}</span>
                </button>
            </div>
            <div class="admin-message-filters">
                <input id="admin-message-search" class="input" type="search" placeholder="Search sender, subject, or body" value="${escapeHtml(state.messageSearch)}">
                <select id="admin-message-status" class="input">
                    <option value="">All messages</option>
                    <option value="unread" ${state.messageStatus === "unread" ? "selected" : ""}>Unread</option>
                    <option value="read" ${state.messageStatus === "read" ? "selected" : ""}>Read</option>
                </select>
            </div>
        </div>
    `;
}

function formatMessageDate(value) {
    if (!value) {
        return "Unknown date";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function getMessageSource(queue = state.messageQueue) {
    if (queue === "deleted") {
        return state.deletedMessagesCache;
    }
    if (queue === "archived") {
        return state.archivedMessagesCache;
    }
    if (queue === "starred") {
        return state.messagesCache.filter((message) => message.starred);
    }
    return state.messagesCache;
}

function renderMessageActionMarkup(message, queue = state.messageQueue, context = "card") {
    const isDeletedQueue = queue === "deleted";
    const readLabel = message.readStatus ? "Mark unread" : "Mark read";
    const readAction = message.readStatus ? "unread" : "read";
    const starLabel = message.starred ? "Unstar" : "Star";
    const starAction = message.starred ? "unstar" : "star";
    const archiveLabel = message.archived ? "Unarchive" : "Archive";
    const archiveAction = message.archived ? "unarchive" : "archive";
    const restoreButton = `<button class="button button-primary" data-message-restore="${message.id}" type="button">Restore</button>`;
    const purgeButton = `<button class="button button-ghost" data-message-purge="${message.id}" type="button">Delete forever</button>`;
    return isDeletedQueue
        ? `${restoreButton}${purgeButton}`
        : `
            <button class="button ${context === "detail" ? "button-primary" : "button-ghost"}" data-message-toggle-read="${message.id}" data-action="${readAction}" type="button">${readLabel}</button>
            <button class="button button-ghost" data-message-toggle-star="${message.id}" data-action="${starAction}" type="button">${starLabel}</button>
            <button class="button button-ghost" data-message-toggle-archive="${message.id}" data-action="${archiveAction}" type="button">${archiveLabel}</button>
            <button class="button button-ghost" data-message-delete="${message.id}" type="button">Delete</button>
        `;
}

function buildMessageDetailMarkup(message) {
    const body = normalizeValue(message.message);
    return `
        <div class="message-detail-shell">
            <div class="message-detail-grid">
                <div class="project-detail-card">
                    <span>Sender</span>
                    <strong>${escapeHtml(message.name || "Anonymous")}</strong>
                    <p class="section-copy">${escapeHtml(message.email || "Email not provided")}</p>
                </div>
                <div class="project-detail-card">
                    <span>Status</span>
                    <strong>${message.deleted ? "Deleted" : (message.archived ? "Archived" : (message.readStatus ? "Read" : "Unread"))}</strong>
                    <p class="section-copy">${formatMessageDate(message.createdAt)}</p>
                </div>
                <div class="project-detail-card">
                    <span>Flags</span>
                    <strong>${message.starred ? "Starred" : (message.archived ? "Archived" : "Normal")}</strong>
                    <p class="section-copy">Message ID ${escapeHtml(message.id ?? "N/A")}</p>
                </div>
            </div>
            <div class="message-detail-body">
                <span class="muted-label">Full message</span>
                <p>${escapeHtml(body).replaceAll("\r\n", "<br>").replaceAll("\n", "<br>")}</p>
            </div>
            <div class="project-detail-actions">
                ${renderMessageActionMarkup(message, state.messageQueue, "detail")}
            </div>
        </div>
    `;
}

function openMessageDetail(message) {
    const modal = document.getElementById("message-detail-modal");
    const title = document.getElementById("message-detail-title");
    const content = document.getElementById("message-detail-content");
    if (!modal || !title || !content) {
        return;
    }
    title.textContent = message.subject || "Message details";
    content.innerHTML = buildMessageDetailMarkup(message);
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    content.querySelector(".button")?.focus();

    content.querySelector(`[data-message-toggle-read="${message.id}"]`)?.addEventListener("click", async (event) => {
        const action = event.currentTarget.dataset.action;
        if (action === "read") {
            await contactApi.markRead(message.id);
        } else {
            await contactApi.markUnread(message.id);
        }
        await refreshMessagesData();
        closeMessageDetail();
    });
    content.querySelector(`[data-message-toggle-star="${message.id}"]`)?.addEventListener("click", async (event) => {
        const action = event.currentTarget.dataset.action;
        if (action === "star") {
            await contactApi.star(message.id);
        } else {
            await contactApi.unstar(message.id);
        }
        await refreshMessagesData();
        closeMessageDetail();
    });
    content.querySelector(`[data-message-toggle-archive="${message.id}"]`)?.addEventListener("click", async (event) => {
        const action = event.currentTarget.dataset.action;
        if (action === "archive") {
            await contactApi.archive(message.id);
        } else {
            await contactApi.unarchive(message.id);
        }
        await refreshMessagesData();
        closeMessageDetail();
    });
    content.querySelector(`[data-message-delete="${message.id}"]`)?.addEventListener("click", async () => {
        await contactApi.remove(message.id);
        await refreshMessagesData();
        closeMessageDetail();
    });
    content.querySelector(`[data-message-restore="${message.id}"]`)?.addEventListener("click", async () => {
        await contactApi.restore(message.id);
        await refreshMessagesData();
        closeMessageDetail();
    });
    content.querySelector(`[data-message-purge="${message.id}"]`)?.addEventListener("click", async () => {
        await contactApi.purge(message.id);
        await refreshMessagesData();
        closeMessageDetail();
    });
}

function closeMessageDetail() {
    const modal = document.getElementById("message-detail-modal");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function filterMessages(messages) {
    const search = normalizeValue(state.messageSearch || document.getElementById("admin-message-search")?.value).toLowerCase();
    const status = state.messageStatus || document.getElementById("admin-message-status")?.value || "";

    return messages.filter((message) => {
        const text = [
            message.subject,
            message.name,
            message.email,
            message.message
        ].join(" ").toLowerCase();
        const matchesSearch = !search || text.includes(search);
        const matchesStatus = !status
            || (status === "read" && message.readStatus)
            || (status === "unread" && !message.readStatus);
        return matchesSearch && matchesStatus;
    });
}

function closeMsgMenus(exceptButton = null) {
    document.querySelectorAll("[data-msg-menu-open]").forEach((button) => {
        if (button !== exceptButton) {
            button.closest(".msg-card-menu-wrap")?.classList.remove("is-open");
            button.setAttribute("aria-expanded", "false");
        }
    });
}

function renderMessagesAdmin(messages) {
    const filtered = filterMessages(getMessageSource());
    const queue = state.messageQueue;
    const isDeletedQueue = queue === "deleted";

    document.getElementById("message-list").innerHTML = filtered.map((message) => {
        const readLabel = message.readStatus ? "Mark Unread" : "Mark Read";
        const readIcon = message.readStatus ? "fa-envelope" : "fa-envelope-open";
        const readAction = message.readStatus ? "unread" : "read";
        const starLabel = message.starred ? "Unstar" : "Star";
        const starIcon = message.starred ? "fa-star" : "fa-regular fa-star";
        const starAction = message.starred ? "unstar" : "star";
        const archiveLabel = message.archived ? "Unarchive" : "Archive";
        const archiveIcon = message.archived ? "fa-box-open" : "fa-box-archive";
        const archiveAction = message.archived ? "unarchive" : "archive";
        const statusText = message.deleted ? "Deleted" : (message.archived ? "Archived" : (message.readStatus ? "Read" : "Unread"));
        const statusClass = message.readStatus ? "" : "is-unread";

        return `
        <article class="admin-message-thread ${message.readStatus ? "" : "is-unread"} ${message.starred ? "is-starred" : ""} ${message.archived ? "is-archived" : ""}" data-msg-card="${message.id}">
            <div class="msg-avatar-col">
                <div class="admin-message-avatar">${escapeHtml((message.name || "A").trim().charAt(0).toUpperCase())}</div>
            </div>
            <div class="msg-body-col">
                <div class="msg-card-top">
                    <div class="msg-card-header">
                        <h3 class="msg-card-subject" style="font-size: 1.05rem; font-weight: 700; color: var(--text); font-family: 'Space Grotesk', sans-serif; margin: 0;">
                            <i class="fa-regular fa-envelope" style="margin-right: 8px; color: var(--accent); font-size: 0.95rem;"></i>${escapeHtml(message.email || "No email provided")}
                        </h3>
                        <p class="msg-card-sender" style="margin-top: 6px; font-size: 0.8rem; color: var(--muted); font-weight: 500; margin-bottom: 0;">
                            <i class="fa-regular fa-clock" style="margin-right: 6px;"></i>Received: ${formatMessageDate(message.createdAt)}
                        </p>
                    </div>
                    <div class="msg-card-badges">
                        ${message.starred ? '<span class="chip chip-starred"><i class="fa-solid fa-star"></i></span>' : ""}
                        <span class="chip msg-status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="msg-card-footer" style="margin-top: 6px; padding-top: 10px; display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid rgba(var(--accent-rgb), 0.05);">
                    <div class="msg-card-menu-wrap">
                        <button class="msg-card-menu-button" data-msg-menu-open="${message.id}" type="button" aria-label="More options" aria-expanded="false">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="msg-card-menu" role="menu" aria-label="Message actions">
                            <button class="msg-card-menu-item" data-msg-action="view" data-msg-id="${message.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-expand"></i>
                                <span>View Details & Message</span>
                            </button>
                            ${isDeletedQueue ? `
                            <button class="msg-card-menu-item" data-msg-action="restore" data-msg-id="${message.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-rotate-left"></i>
                                <span>Restore</span>
                            </button>
                            <div class="msg-card-menu-divider" role="separator"></div>
                            <button class="msg-card-menu-item is-danger" data-msg-action="purge" data-msg-id="${message.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-fire"></i>
                                <span>Delete Forever</span>
                            </button>
                            ` : `
                            <button class="msg-card-menu-item" data-msg-action="toggle-read" data-msg-id="${message.id}" data-action="${readAction}" type="button" role="menuitem">
                                <i class="fa-solid ${readIcon}"></i>
                                <span>${readLabel}</span>
                            </button>
                            <button class="msg-card-menu-item" data-msg-action="toggle-star" data-msg-id="${message.id}" data-action="${starAction}" type="button" role="menuitem">
                                <i class="${message.starred ? "fa-solid" : "fa-regular"} fa-star"></i>
                                <span>${starLabel}</span>
                            </button>
                            <button class="msg-card-menu-item" data-msg-action="copy-email" data-msg-email="${escapeHtml(message.email || "")}" type="button" role="menuitem">
                                <i class="fa-solid fa-copy"></i>
                                <span>Copy Email</span>
                            </button>
                            ${message.email ? `
                            <a class="msg-card-menu-item" href="mailto:${escapeHtml(message.email)}?subject=Re: ${encodeURIComponent(message.subject || "")}" role="menuitem">
                                <i class="fa-solid fa-reply"></i>
                                <span>Reply via Email</span>
                            </a>` : ""}
                            <button class="msg-card-menu-item" data-msg-action="toggle-archive" data-msg-id="${message.id}" data-action="${archiveAction}" type="button" role="menuitem">
                                <i class="fa-solid ${archiveIcon}"></i>
                                <span>${archiveLabel}</span>
                            </button>
                            <div class="msg-card-menu-divider" role="separator"></div>
                            <button class="msg-card-menu-item is-danger" data-msg-action="delete" data-msg-id="${message.id}" type="button" role="menuitem">
                                <i class="fa-solid fa-trash"></i>
                                <span>Delete</span>
                            </button>
                            `}
                        </div>
                        <div class="msg-delete-popover hidden" data-msg-confirmation="${message.id}">
                            <p>${isDeletedQueue ? "Permanently delete this message?" : "Move this message to trash?"}</p>
                            <div class="msg-delete-popover-actions">
                                <button class="button button-ghost" type="button" data-msg-confirm-cancel="${message.id}">Cancel</button>
                                <button class="button button-danger" type="button" data-msg-confirm-delete="${message.id}" data-purge="${isDeletedQueue}">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
    }).join("") || emptyMarkup(getMessageSource().length ? "No messages match the selected filters." : "No messages found.");

    // Bind event delegation once
    if (!document.getElementById("message-list")?.dataset.menuBound) {
        const list = document.getElementById("message-list");
        if (list) {
            list.dataset.menuBound = "true";
            list.addEventListener("click", async (event) => {
                const openButton = event.target.closest("[data-msg-menu-open]");
                const actionButton = event.target.closest("[data-msg-action]");
                const cancelButton = event.target.closest("[data-msg-confirm-cancel]");
                const confirmButton = event.target.closest("[data-msg-confirm-delete]");

                const hideMsgConfirmations = () => {
                    list.querySelectorAll(".msg-delete-popover").forEach((panel) => panel.classList.add("hidden"));
                };

                if (openButton) {
                    event.stopPropagation();
                    const menuWrap = openButton.closest(".msg-card-menu-wrap");
                    const willOpen = !menuWrap?.classList.contains("is-open");
                    closeMsgMenus(openButton);
                    menuWrap?.classList.toggle("is-open", willOpen);
                    openButton.setAttribute("aria-expanded", String(willOpen));
                    return;
                }

                if (cancelButton) {
                    event.stopPropagation();
                    hideMsgConfirmations();
                    return;
                }

                if (confirmButton) {
                    event.stopPropagation();
                    const msgId = confirmButton.getAttribute("data-msg-confirm-delete");
                    const isPurge = confirmButton.getAttribute("data-purge") === "true";
                    try {
                        if (isPurge) {
                            await contactApi.purge(msgId);
                        } else {
                            await contactApi.remove(msgId);
                        }
                        await refreshMessagesData();
                    } catch (error) {
                        alert("Message action failed: " + error.message);
                    }
                    hideMsgConfirmations();
                    return;
                }

                if (!actionButton) {
                    return;
                }
                event.stopPropagation();
                const action = actionButton.getAttribute("data-msg-action");
                const msgId = actionButton.getAttribute("data-msg-id");
                const message = [...state.messagesCache, ...state.archivedMessagesCache, ...state.deletedMessagesCache]
                    .find((item) => String(item.id) === String(msgId));

                try {
                    closeMsgMenus();
                    if (action === "view") {
                        if (message) openMessageDetail(message);
                        return;
                    }
                    if (action === "toggle-read") {
                        const readAction = actionButton.getAttribute("data-action");
                        if (readAction === "read") {
                            await contactApi.markRead(msgId);
                        } else {
                            await contactApi.markUnread(msgId);
                        }
                        await refreshMessagesData();
                        return;
                    }
                    if (action === "toggle-star") {
                        const starAction = actionButton.getAttribute("data-action");
                        if (starAction === "star") {
                            await contactApi.star(msgId);
                        } else {
                            await contactApi.unstar(msgId);
                        }
                        await refreshMessagesData();
                        return;
                    }
                    if (action === "toggle-archive") {
                        const archiveAction = actionButton.getAttribute("data-action");
                        if (archiveAction === "archive") {
                            await contactApi.archive(msgId);
                        } else {
                            await contactApi.unarchive(msgId);
                        }
                        await refreshMessagesData();
                        return;
                    }
                    if (action === "copy-email") {
                        const email = actionButton.getAttribute("data-msg-email");
                        if (email) {
                            await copyTextToClipboard(email);
                        }
                        return;
                    }
                    if (action === "restore") {
                        await contactApi.restore(msgId);
                        await refreshMessagesData();
                        return;
                    }
                    if (action === "delete" || action === "purge") {
                        hideMsgConfirmations();
                        const confirmationPanel = list.querySelector(`[data-msg-confirmation="${msgId}"]`);
                        confirmationPanel?.classList.remove("hidden");
                        return;
                    }
                } catch (error) {
                    alert("Message action failed: " + error.message);
                }
            });
        }
    }
}

async function refreshMessagesData() {
    const [inboxResponse, archivedResponse, deletedResponse] = await Promise.all([
        contactApi.list(),
        contactApi.listArchived(),
        contactApi.listDeleted()
    ]);
    state.messagesCache = inboxResponse.data || [];
    state.archivedMessagesCache = archivedResponse.data || [];
    state.deletedMessagesCache = deletedResponse.data || [];
    renderMessageControls();
    renderMessagesAdmin();
}

async function initMessages() {
    await refreshMessagesData();

    const modal = document.getElementById("message-detail-modal");
    const closeButton = document.getElementById("message-detail-close");
    closeButton?.addEventListener("click", closeMessageDetail);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeMessageDetail();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
            closeMessageDetail();
        }
    });

    const controls = document.getElementById("message-controls");
    if (controls && !controls.dataset.bound) {
        controls.dataset.bound = "true";
        controls.addEventListener("click", (event) => {
            const button = event.target.closest("[data-message-queue]");
            if (!button) {
                return;
            }
            state.messageQueue = button.dataset.messageQueue || "inbox";
            renderMessageControls();
            renderMessagesAdmin();
        });
        controls.addEventListener("input", () => {
            state.messageSearch = document.getElementById("admin-message-search")?.value || "";
            renderMessagesAdmin();
        });
        controls.addEventListener("change", () => {
            state.messageStatus = document.getElementById("admin-message-status")?.value || "";
            renderMessagesAdmin();
        });
    }
}

function renderProfileSummaryGrid(container, data) {
    const grid = container.querySelector(".summary-grid");
    if (!grid) return;
    grid.innerHTML = `
        <div class="summary-card summary-image-card">
            <span class="muted-label"><i class="fa-solid fa-image" style="margin-right:6px;"></i>Profile Image</span>
            <div class="summary-portrait">
                <img src="${data.profileImageUrl || "/api/v1/assets/images/profile-placeholder.jpg"}" alt="Profile preview">
            </div>
        </div>
        <div class="summary-card">
            <span class="muted-label"><i class="fa-solid fa-id-badge" style="margin-right:6px;"></i>Current Profile</span>
            <strong>${data.name || "Admin profile"}</strong>
            <p class="section-copy">${data.designation || "No designation set"}</p>
            <p class="section-copy" style="font-size:0.88rem;"><i class="fa-solid fa-location-dot" style="margin-right:6px; color:var(--accent);"></i>${data.currentLocation || "Location unavailable"}</p>
        </div>
        <div class="summary-card">
            <span class="muted-label"><i class="fa-solid fa-link" style="margin-right:6px;"></i>Public Links</span>
            <p class="section-copy" style="word-break:break-all;"><i class="fa-solid fa-envelope" style="margin-right:6px; color:var(--accent);"></i>${data.email || "Email not set"}</p>
            <p class="section-copy" style="word-break:break-all;"><i class="fa-brands fa-github" style="margin-right:6px; color:var(--accent);"></i>${data.githubUrl || "GitHub not linked"}</p>
            <p class="section-copy" style="word-break:break-all;"><i class="fa-brands fa-linkedin" style="margin-right:6px; color:var(--accent);"></i>${data.linkedinUrl || "LinkedIn not linked"}</p>
        </div>
    `;
}

async function initProfile() {
    const aboutForm = document.getElementById("about-form");
    const passwordForm = document.getElementById("password-form");
    const profileSummary = document.getElementById("profile-summary");
    const profileModal = document.getElementById("profile-editor-modal");
    const profileModalTitle = document.getElementById("profile-modal-title");
    const profileModalCopy = document.getElementById("profile-modal-copy");
    const profileTabBtn = document.getElementById("profile-tab-btn");
    const passwordTabBtn = document.getElementById("password-tab-btn");
    const profileModalClose = document.getElementById("profile-modal-close");

    function setEditorMode(section = "about") {
        const isAbout = section === "about";
        aboutForm.classList.toggle("is-hidden", !isAbout);
        passwordForm.classList.toggle("is-hidden", isAbout);
        profileTabBtn.classList.toggle("active", isAbout);
        passwordTabBtn.classList.toggle("active", !isAbout);
        profileModalTitle.textContent = isAbout ? "Update profile" : "Change password";
        profileModalCopy.textContent = isAbout
            ? "Edit the public identity in a focused popup without leaving the control plane."
            : "Rotate credentials from the same popup so the workflow stays intentional and secure.";
    }

    function openEditor(section = "about") {
        setEditorMode(section);
        profileModal.classList.remove("hidden");
        profileModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (section === "about") {
            goToStep(1);
        }
        (section === "about" ? aboutForm : passwordForm).querySelector(".input")?.focus();
    }

    function closeEditor() {
        profileModal.classList.add("hidden");
        profileModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    profileSummary.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Profile Overview</p>
                <h2>Managed identity</h2>
                <p class="form-help">Your public-facing profile and admin credentials, managed from a single control plane.</p>
            </div>
            <span class="chip">Controlled access</span>
        </div>
        <div class="summary-grid">
            <div class="summary-card summary-image-card">
                <span class="muted-label"><i class="fa-solid fa-image" style="margin-right:6px;"></i>Profile Image</span>
                <div class="summary-portrait">
                    <img src="${state.aboutSnapshot?.profileImageUrl || "/api/v1/assets/images/profile-placeholder.jpg"}" alt="Profile preview">
                </div>
            </div>
            <div class="summary-card">
                <span class="muted-label"><i class="fa-solid fa-id-badge" style="margin-right:6px;"></i>Current Profile</span>
                <strong>${state.aboutSnapshot?.name || "Loading..."}</strong>
                <p class="section-copy">${state.aboutSnapshot?.designation || "Loading..."}</p>
                <p class="section-copy" style="font-size:0.88rem;"><i class="fa-solid fa-location-dot" style="margin-right:6px; color:var(--accent);"></i>${state.aboutSnapshot?.currentLocation || "Location not set"}</p>
            </div>
            <div class="summary-card">
                <span class="muted-label"><i class="fa-solid fa-link" style="margin-right:6px;"></i>Public Links</span>
                <p class="section-copy" style="word-break:break-all;"><i class="fa-solid fa-envelope" style="margin-right:6px; color:var(--accent);"></i>${state.aboutSnapshot?.email || "Email not set"}</p>
                <p class="section-copy" style="word-break:break-all;"><i class="fa-brands fa-github" style="margin-right:6px; color:var(--accent);"></i>${state.aboutSnapshot?.githubUrl || "GitHub not linked"}</p>
                <p class="section-copy" style="word-break:break-all;"><i class="fa-brands fa-linkedin" style="margin-right:6px; color:var(--accent);"></i>${state.aboutSnapshot?.linkedinUrl || "LinkedIn not linked"}</p>
            </div>
        </div>
        <div class="table-actions" style="margin-top: 18px;">
            <button id="profile-edit-btn" class="button button-primary" type="button"><i class="fa-solid fa-pen-to-square" style="margin-right:6px;"></i>Update profile</button>
            <button id="password-edit-btn" class="button button-ghost" type="button"><i class="fa-solid fa-shield-halved" style="margin-right:6px;"></i>Change password</button>
        </div>
    `;
    aboutForm.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">About API</p>
                <h2>Professional identity</h2>
                <p class="form-help">Structure your public portfolio profile through our interactive staged wizard.</p>
            </div>
            <span class="chip">Public profile source</span>
        </div>

        <!-- Wizard Navigation Stages -->
        <div class="profile-wizard-steps" style="display: flex; gap: 8px; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid rgba(var(--accent-rgb), 0.08); padding-bottom: 16px;">
            <div class="wizard-step active" data-step="1" style="flex: 1; text-align: center; font-weight: 700; cursor: pointer; color: var(--accent); font-size: 0.88rem; transition: all 0.2s ease;">1. Identity</div>
            <div class="wizard-step" data-step="2" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">2. Biography</div>
            <div class="wizard-step" data-step="3" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">3. Socials</div>
            <div class="wizard-step" data-step="4" style="flex: 1; text-align: center; font-weight: 500; cursor: pointer; color: var(--muted); font-size: 0.88rem; transition: all 0.2s ease;">4. Portrait</div>
        </div>

        <!-- Step 1: Basic Identity -->
        <div class="wizard-pane active" data-pane="1">
            <div class="field-grid">
                <label><span>Name</span><input class="input" name="name" required></label>
                <label><span>Designation</span><input class="input" name="designation" required></label>
            </div>
            <div class="field-grid" style="margin-top: 14px;">
                <label><span>Experience Years</span><input class="input" type="number" name="experienceYears" min="0" required></label>
                <label><span>Current Location</span><input class="input" name="currentLocation" required></label>
            </div>
        </div>

        <!-- Step 2: Biography & Ticker -->
        <div class="wizard-pane" data-pane="2" style="display: none;">
            <label><span>Biography</span><textarea class="input textarea" name="biography" style="height: 120px;" required></textarea></label>
            <label style="margin-top: 14px; display: block;"><span>Headline ticker items</span><textarea class="input textarea" name="headlineTicker" style="height: 80px;" placeholder="System Architecture, Backend Engineering, REST APIs, JWT Security, Microservices"></textarea></label>
        </div>

        <!-- Step 3: Social Contacts -->
        <div class="wizard-pane" data-pane="3" style="display: none;">
            <div class="field-grid">
                <label><span>Email</span><input class="input" type="email" name="email" required></label>
                <label><span>Phone</span><input class="input" name="phone"></label>
            </div>
            <div class="field-grid" style="margin-top: 14px;">
                <label><span>LinkedIn URL</span><input class="input" name="linkedinUrl"></label>
                <label><span>GitHub URL</span><input class="input" name="githubUrl"></label>
            </div>
            <label style="margin-top: 14px; display: block;"><span>Portfolio URL</span><input class="input" name="portfolioUrl"></label>
        </div>

        <!-- Step 4: Photo Dropzone -->
        <div class="wizard-pane" data-pane="4" style="display: none;">
            <label><span>Profile Image URL</span><input class="input" name="profileImageUrl" id="profile-image-url-field" placeholder="/api/v1/assets/images/profile-placeholder.jpg"></label>
            
            <div style="margin-top: 16px;">
                <span class="muted-label" style="display: block; margin-bottom: 8px;">Upload Image</span>
                <div class="drag-drop-zone" id="profile-drag-drop" style="border: 2px dashed rgba(var(--accent-rgb), 0.25); border-radius: 16px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(var(--accent-rgb), 0.01);">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 12px;"></i>
                    <p style="margin: 0; font-weight: 600; font-size: 0.9rem;">Drag & drop your profile image here</p>
                    <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--muted);">or click to browse from device</p>
                    <input type="file" id="profile-file-input" accept="image/*" style="display: none;">
                </div>
                <div id="profile-upload-status" style="margin-top: 10px; font-size: 0.82rem; font-weight: 500; display: none;"></div>
            </div>
        </div>

        <div class="form-actions" style="margin-top: 24px; display: flex; justify-content: space-between;">
            <button class="button button-ghost" id="wizard-prev" type="button" style="visibility: hidden;"><i class="fa-solid fa-arrow-left" style="margin-right: 6px;"></i>Back</button>
            <div>
                <button class="button button-ghost" id="wizard-next" type="button">Next<i class="fa-solid fa-arrow-right" style="margin-left: 6px;"></i></button>
                <button class="button button-primary" id="wizard-submit" type="submit" style="display: none;"><i class="fa-solid fa-check" style="margin-right:6px;"></i>Save profile</button>
            </div>
        </div>
    `;

    // Wizard Navigation Logic
    let currentStep = 1;
    const steps = aboutForm.querySelectorAll(".wizard-step");
    const panes = aboutForm.querySelectorAll(".wizard-pane");
    const prevBtn = aboutForm.querySelector("#wizard-prev");
    const nextBtn = aboutForm.querySelector("#wizard-next");
    const submitBtn = aboutForm.querySelector("#wizard-submit");

    function goToStep(stepNum) {
        if (stepNum < 1 || stepNum > 4) return;
        currentStep = stepNum;

        // Toggle active classes on steps
        steps.forEach((s) => {
            const val = parseInt(s.dataset.step);
            s.classList.toggle("active", val === currentStep);
            s.style.color = val === currentStep ? "var(--accent)" : "var(--muted)";
            s.style.fontWeight = val === currentStep ? "700" : "500";
        });

        // Toggle active panes
        panes.forEach((p) => {
            p.style.display = parseInt(p.dataset.pane) === currentStep ? "block" : "none";
        });

        // Toggle control buttons visibility
        prevBtn.style.visibility = currentStep === 1 ? "hidden" : "visible";
        
        if (currentStep === 4) {
            nextBtn.style.display = "none";
            submitBtn.style.display = "inline-flex";
        } else {
            nextBtn.style.display = "inline-flex";
            submitBtn.style.display = "none";
        }
    }

    nextBtn.addEventListener("click", () => {
        // Simple input validation before going to next step
        const activePane = aboutForm.querySelector(`.wizard-pane[data-pane="${currentStep}"]`);
        const invalid = activePane.querySelector("input:invalid, textarea:invalid");
        if (invalid) {
            invalid.reportValidity();
            return;
        }
        goToStep(currentStep + 1);
    });

    prevBtn.addEventListener("click", () => {
        goToStep(currentStep - 1);
    });

    steps.forEach((s) => {
        s.addEventListener("click", () => {
            const stepNum = parseInt(s.dataset.step);
            // Allow stepping backward or jumping forward if the current pane is valid
            if (stepNum < currentStep) {
                goToStep(stepNum);
            } else {
                // Validate intermediate stages
                for (let i = currentStep; i < stepNum; i++) {
                    const activePane = aboutForm.querySelector(`.wizard-pane[data-pane="${i}"]`);
                    const invalid = activePane.querySelector("input:invalid, textarea:invalid");
                    if (invalid) {
                        goToStep(i);
                        invalid.reportValidity();
                        return;
                    }
                }
                goToStep(stepNum);
            }
        });
    });

    // Drag and Drop File Upload Logic
    const dragDrop = aboutForm.querySelector("#profile-drag-drop");
    const fileInput = aboutForm.querySelector("#profile-file-input");
    const uploadStatus = aboutForm.querySelector("#profile-upload-status");
    const imgField = aboutForm.querySelector("#profile-image-url-field");

    dragDrop.addEventListener("click", () => fileInput.click());

    dragDrop.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragDrop.style.borderColor = "var(--accent)";
        dragDrop.style.background = "rgba(var(--accent-rgb), 0.04)";
    });

    ["dragleave", "drop"].forEach((type) => {
        dragDrop.addEventListener(type, () => {
            dragDrop.style.borderColor = "rgba(var(--accent-rgb), 0.25)";
            dragDrop.style.background = "rgba(var(--accent-rgb), 0.01)";
        });
    });

    dragDrop.addEventListener("drop", async (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length) {
            await handleProfileImageUpload(files[0]);
        }
    });

    fileInput.addEventListener("change", async () => {
        if (fileInput.files.length) {
            await handleProfileImageUpload(fileInput.files[0]);
        }
    });

    async function handleProfileImageUpload(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please upload a valid image file.");
            return;
        }
        uploadStatus.style.display = "block";
        uploadStatus.style.color = "var(--accent)";
        uploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i>Uploading image...`;

        try {
            const response = await filesApi.upload(file, "PROJECT_IMAGE");
            const downloadUrl = response.data.downloadUrl;
            imgField.value = downloadUrl;

            uploadStatus.style.color = "#10b981";
            uploadStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Image uploaded successfully!`;

            // Preview instantly in wizard card if elements exist
            const summaryPreview = document.querySelector(".summary-portrait img");
            if (summaryPreview) {
                summaryPreview.src = downloadUrl;
            }
        } catch (error) {
            uploadStatus.style.color = "var(--danger)";
            uploadStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="margin-right:6px;"></i>Upload failed: ${error.message}`;
        }
    }

    passwordForm.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Change Password</p>
                <h2>Credential rotation</h2>
                <p class="form-help">Use a strong new password and keep the admin console ready for handoff-grade operations.</p>
            </div>
            <span class="chip">Security</span>
        </div>
        <label><span>Current Password</span><input class="input" type="password" name="currentPassword" required></label>
        <label><span>New Password</span><input class="input" type="password" name="newPassword" required minlength="8"></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-lock" style="margin-right:6px;"></i>Update password</button>
        </div>
    `;

    const [aboutResponse, meResponse] = await Promise.allSettled([aboutApi.getAdmin(), authApi.me()]);
    if (aboutResponse.status === "fulfilled") {
        state.aboutSnapshot = aboutResponse.value.data || {};
        fillForm(aboutForm, state.aboutSnapshot);
        renderProfileSummaryGrid(profileSummary, state.aboutSnapshot);
    }
    if (meResponse.status === "fulfilled") {
        setFormStatus(passwordForm, `Authenticated as ${(meResponse.value.data?.email || "admin")}.`);
    }

    document.getElementById("profile-edit-btn").addEventListener("click", () => openEditor("about"));
    document.getElementById("password-edit-btn").addEventListener("click", () => openEditor("password"));
    profileTabBtn.addEventListener("click", () => setEditorMode("about"));
    passwordTabBtn.addEventListener("click", () => setEditorMode("password"));
    profileModalClose.addEventListener("click", closeEditor);
    profileModal.addEventListener("click", (event) => {
        if (event.target === profileModal) {
            closeEditor();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !profileModal.classList.contains("hidden")) {
            closeEditor();
        }
    });

    aboutForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const payload = Object.fromEntries(new FormData(aboutForm).entries());
            payload.experienceYears = Number(payload.experienceYears);
            await aboutApi.update(payload);
            setFormStatus(aboutForm, "Profile updated successfully.", "success");
            state.aboutSnapshot = { ...state.aboutSnapshot, ...payload };
            closeEditor();
            renderProfileSummaryGrid(profileSummary, state.aboutSnapshot);
        } catch (error) {
            setFormStatus(aboutForm, error.message, "error");
        }
    });

    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const payload = Object.fromEntries(new FormData(passwordForm).entries());
            await authApi.changePassword(payload);
            passwordForm.reset();
            setFormStatus(passwordForm, "Password updated successfully.", "success");
            closeEditor();
        } catch (error) {
            setFormStatus(passwordForm, error.message, "error");
        }
    });
}

function closeResumeMenus(exceptButton = null) {
    document.querySelectorAll("[data-resume-menu-open]").forEach((button) => {
        if (button !== exceptButton) {
            button.closest(".resume-card-menu-wrap")?.classList.remove("is-open");
            button.setAttribute("aria-expanded", "false");
        }
    });
}

async function initResume() {
    const form = document.getElementById("resume-form");
    const modal = document.getElementById("resume-editor-modal");
    const openBtn = document.getElementById("add-resume-btn");
    const closeBtn = document.getElementById("resume-modal-close");

    const closeResumeEditor = () => {
        modal?.classList.add("hidden");
        modal?.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    };

    openBtn?.addEventListener("click", () => {
        modal?.classList.remove("hidden");
        modal?.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        form.querySelector(".input")?.focus();
    });

    closeBtn?.addEventListener("click", closeResumeEditor);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeResumeEditor();
        }
    });

    form.innerHTML = `
        <label><span>Version Label</span><input class="input" name="versionLabel" value="latest" maxlength="80" required></label>
        <label><span>Resume file</span><input class="input" type="file" name="file" accept=".pdf,.doc,.docx,.txt,.rtf" required></label>
        <p class="form-help">Accepted file types: PDF, DOC, DOCX, TXT, and RTF.</p>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-cloud-arrow-up" style="margin-right:6px;"></i>Upload resume</button>
            <button class="button button-ghost" id="resume-reset" type="button">Cancel</button>
        </div>
    `;

    document.getElementById("resume-reset")?.addEventListener("click", closeResumeEditor);

    async function loadMetadata() {
        try {
            const [currentResponse, allResponse] = await Promise.all([
                resumeApi.adminMetadata(),
                resumeApi.listAdmin()
            ]);
            const data = currentResponse.data;
            const resumes = allResponse.data || [];
            state.resumeSnapshot = data;
            const activeResume = resumes.find((resume) => resume.active) || data;

            let currentResumeHtml = "";
            if (data) {
                currentResumeHtml = `
                    <div class="resume-featured-header">
                        <div>
                            <span class="eyebrow">Active Resume</span>
                            <h2 class="resume-featured-title">${escapeHtml(activeResume?.versionLabel || data.versionLabel)}</h2>
                            <p class="section-copy">This version is currently displayed on the public site.</p>
                        </div>
                        <span class="chip visibility-badge">Active Display</span>
                    </div>
                    <div class="resume-featured-card">
                        <div class="resume-featured-icon">
                            <i class="fa-solid fa-file-pdf"></i>
                        </div>
                        <div class="resume-featured-details">
                            <h3>${escapeHtml(activeResume?.file?.originalFileName || data.file?.originalFileName || "Resume file")}</h3>
                            <p>${activeResume?.file?.contentType || data.file?.contentType || "Document"}${(activeResume?.file?.size || data.file?.size) ? ` &middot; ${formatBytes(activeResume?.file?.size || data.file?.size)}` : ""}</p>
                            <span class="resume-upload-time">Uploaded ${new Date(activeResume?.uploadedAt || data.uploadedAt).toLocaleString()}</span>
                        </div>
                        <div class="resume-featured-actions">
                            <a class="button button-primary" href="${activeResume?.file?.downloadUrl || data.file?.downloadUrl || resumeApi.downloadUrl()}" target="_blank" rel="noreferrer">
                                <i class="fa-solid fa-expand" style="margin-right:6px;"></i>Open Resume
                            </a>
                            <button class="button button-ghost" id="copy-resume-link" type="button">
                                <i class="fa-solid fa-link" style="margin-right:6px;"></i>Copy Link
                            </button>
                        </div>
                    </div>
                `;
            } else {
                currentResumeHtml = emptyMarkup("No active resume set.");
            }

            const listMarkup = resumes.map((resume) => `
                <article class="table-card resume-version-card ${resume.active ? "is-active" : ""}">
                    <header class="resume-card-top">
                        <div class="resume-badge-row">
                            <span class="resume-icon-container"><i class="fa-solid fa-file-invoice"></i></span>
                            <span class="chip visibility-badge ${resume.active ? "" : "is-stored"}">${resume.active ? "Active" : "Stored"}</span>
                        </div>
                        
                        <div class="resume-card-menu-wrap">
                            <button class="resume-card-menu-button" data-resume-menu-open="${resume.id}" type="button" aria-label="More options" aria-expanded="false">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div class="resume-card-menu" role="menu" aria-label="Resume actions">
                                ${resume.active ? "" : `
                                <button class="resume-card-menu-item" data-resume-action="display" data-resume-id="${resume.id}" type="button" role="menuitem">
                                    <i class="fa-solid fa-circle-check"></i>
                                    <span>Display on Site</span>
                                </button>
                                `}
                                <a class="resume-card-menu-item" href="${resume.file?.downloadUrl || resumeApi.downloadUrl()}" target="_blank" rel="noreferrer" role="menuitem">
                                    <i class="fa-solid fa-file-pdf"></i>
                                    <span>Open Document</span>
                                </a>
                                <a class="resume-card-menu-item" href="${resume.file?.downloadUrl || resumeApi.downloadUrl()}" download role="menuitem">
                                    <i class="fa-solid fa-download"></i>
                                    <span>Download File</span>
                                </a>
                                <button class="resume-card-menu-item" data-resume-action="copy-link" data-resume-link-val="${resume.file?.downloadUrl || resumeApi.downloadUrl()}" type="button" role="menuitem">
                                    <i class="fa-solid fa-link"></i>
                                    <span>Copy URL</span>
                                </button>
                            </div>
                        </div>
                    </header>
                    
                    <div class="resume-card-body">
                        <h3 class="resume-card-title">${escapeHtml(resume.versionLabel)}</h3>
                        <p class="resume-card-filename">${escapeHtml(resume.file?.originalFileName || "Resume file")}</p>
                    </div>
                    
                    <div class="resume-card-meta">
                        <span>Uploaded</span>
                        <strong>${new Date(resume.uploadedAt).toLocaleDateString()}</strong>
                        ${resume.file?.size ? `<span>&middot;</span> <strong>${formatBytes(resume.file.size)}</strong>` : ""}
                    </div>
                </article>
            `).join("") || emptyMarkup("No version history available.");

            document.getElementById("resume-metadata").innerHTML = `
                <div class="resume-grid-layout">
                    <div class="resume-featured-section">${currentResumeHtml}</div>
                    <div class="resume-history-section">
                        <div class="resume-history-header">
                            <div>
                                <span class="eyebrow">Version History</span>
                                <h2>Display Selection</h2>
                                <p class="section-copy">Switch between uploaded versions to update your public profile.</p>
                            </div>
                        </div>
                        <div class="resume-version-grid">${listMarkup}</div>
                    </div>
                </div>
            `;

            document.getElementById("copy-resume-link")?.addEventListener("click", async () => {
                const link = activeResume?.file?.downloadUrl || data?.file?.downloadUrl || resumeApi.downloadUrl();
                try {
                    await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                    alert("Resume link copied to clipboard.");
                } catch {
                    alert("Could not copy the resume link.");
                }
            });

            // Bind menu events
            const metadataContainer = document.getElementById("resume-metadata");
            metadataContainer.querySelectorAll("[data-resume-menu-open]").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const wrap = btn.closest(".resume-card-menu-wrap");
                    const isOpen = wrap?.classList.contains("is-open");
                    closeResumeMenus();
                    if (!isOpen) {
                        wrap?.classList.add("is-open");
                        btn.setAttribute("aria-expanded", "true");
                    }
                });
            });

            // Bind menu actions
            metadataContainer.querySelectorAll("[data-resume-action]").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    closeResumeMenus();
                    const action = btn.getAttribute("data-resume-action");
                    if (action === "display") {
                        const id = btn.getAttribute("data-resume-id");
                        const targetResume = resumes.find((r) => String(r.id) === String(id));
                        if (!confirmDanger(`Display "${targetResume?.versionLabel}" on the public site?`)) {
                            return;
                        }
                        try {
                            await resumeApi.display(id);
                            await loadMetadata();
                        } catch (err) {
                            alert("Action failed: " + err.message);
                        }
                    } else if (action === "copy-link") {
                        const linkVal = btn.getAttribute("data-resume-link-val");
                        try {
                            await navigator.clipboard.writeText(`${window.location.origin}${linkVal}`);
                            alert("Resume version link copied to clipboard.");
                        } catch {
                            alert("Could not copy the resume link.");
                        }
                    }
                });
            });

        } catch (error) {
            const message = error?.status === 404
                ? "No resume uploaded."
                : (error?.message || "Unable to load resume metadata.");
            document.getElementById("resume-metadata").innerHTML = `
                <div class="empty-state" style="display:grid; gap:12px;">
                    <strong>${message}</strong>
                    <span class="section-copy">
                        ${error?.status === 404
                            ? "Click 'Add Resume' above to upload a file."
                            : "Check the API response or refresh after confirming the backend is running."}
                    </span>
                </div>
            `;
        }
    }

    // Document click-away listener for resume dropdown menus
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".resume-card-menu-wrap")) {
            closeResumeMenus();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            const file = fd.get("file");
            if (!isAllowedDocument(file)) {
                throw new Error("Please upload a PDF, DOC, DOCX, TXT, or RTF file.");
            }
            await resumeApi.upload(file, fd.get("versionLabel"));
            form.reset();
            form.elements.versionLabel.value = "latest";
            closeResumeEditor();
            await loadMetadata();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });

    await loadMetadata();
}

async function bootstrap() {
    initTheme();
    createSidebar();
    bindLogout();
    if (!(await protect())) {
        return;
    }

    const handlers = {
        dashboard: initDashboard,
        projects: initProjects,
        "project-notes": initProjectNotesPage,
        skills: initSkills,
        certifications: initCertifications,
        messages: initMessages,
        profile: initProfile,
        resume: initResume
    };

    try {
        await handlers[page]?.();
    } catch (error) {
        document.querySelector(".admin-main")?.insertAdjacentHTML("beforeend", emptyMarkup(error.message));
    }

}

bootstrap();
