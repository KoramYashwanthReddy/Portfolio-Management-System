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
    editingProjectId: null,
    editingProjectNoteId: null,
    editingSkillId: null,
    editingCertificationId: null,
    currentProject: null,
    currentProjectNotes: [],
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

function renderMetricCards(metrics) {
    return metrics.map((metric) => `
        <article class="metric-card">
            <div class="metric-card-header">
                <span class="muted-label">${metric.label}</span>
                <i class="${metric.icon || 'fa-solid fa-chart-line'}"></i>
            </div>
            <strong>${metric.value}</strong>
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
    const response = await dashboardApi.get();
    const data = response.data;
    document.getElementById("dashboard-metrics").innerHTML = renderMetricCards([
        { label: "Total Projects", value: data.totalProjects, icon: "fa-solid fa-briefcase" },
        { label: "Total Skills", value: data.totalSkills, icon: "fa-solid fa-bolt" },
        { label: "Certifications", value: data.totalCertifications, icon: "fa-solid fa-certificate" },
        { label: "Messages", value: data.totalMessages, icon: "fa-solid fa-envelope" },
        { label: "Featured", value: data.totalFeaturedProjects, icon: "fa-solid fa-star" }
    ]);
    document.getElementById("dashboard-messages").innerHTML = (data.recentMessages || []).map((message) => `
        <article class="message-card">
            <header><strong>${message.subject}</strong><span>${message.readStatus ? "Read" : "Unread"}</span></header>
            <p>${message.name} | ${message.email}</p>
        </article>
    `).join("") || emptyMarkup("No recent messages.");
    document.getElementById("dashboard-projects").innerHTML = (data.recentProjects || []).map((project, index) => `
        <article class="table-card dashboard-project-card">
            <header>
                <div>
                    <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                    <strong>${project.title}</strong>
                    <p class="section-copy">${project.shortDescription}</p>
                </div>
                <span class="chip">${project.status || "Updated"}</span>
            </header>
            <div class="chip-row">
                <span class="chip">${project.category || "OTHER"}</span>
                ${project.featured ? '<span class="chip">Featured</span>' : ""}
                ${project.completionDate ? `<span class="chip">${project.completionDate}</span>` : ""}
            </div>
        </article>
    `).join("") || emptyMarkup("No recent projects.");

    const canvas = document.getElementById("dashboard-chart");
    if (canvas && window.Chart) {
        new window.Chart(canvas, {
            type: "doughnut",
            data: {
                labels: ["Projects", "Skills", "Certifications", "Messages"],
                datasets: [{
                    data: [data.totalProjects, data.totalSkills, data.totalCertifications, data.totalMessages],
                    backgroundColor: ["#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b"],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { 
                            color: "#4b5563",
                            padding: 20,
                            font: {
                                family: "'IBM Plex Sans', sans-serif",
                                size: 13
                            },
                            usePointStyle: true
                        } 
                    }
                },
                layout: {
                    padding: 20
                }
            }
        });
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

function renderCertificationsAdmin(certifications) {
    const filtered = filterCertifications(certifications);
    document.getElementById("admin-certification-list").innerHTML = filtered.map((certification) => `
        <article class="table-card admin-cert-card">
            <header>
                <div>
                    <span class="card-number">Cert</span>
                    <strong>${certification.title}</strong>
                    <p class="section-copy">${certification.issuer}</p>
                </div>
                <span class="chip">${certification.displayed === false ? "Hidden" : "Displayed"}</span>
            </header>
            <div class="chip-row">
                <span class="chip">${certification.expiryDate ? "Active" : "Open"}</span>
                <span class="chip">Issued ${certification.issueDate}</span>
                ${certification.expiryDate ? `<span class="chip">Expires ${certification.expiryDate}</span>` : ""}
                ${certification.credentialId ? `<span class="chip">ID ${certification.credentialId}</span>` : ""}
            </div>
            <div class="table-actions">
                <button class="button button-ghost" data-cert-edit="${certification.id}" type="button">Edit</button>
                <button class="button button-ghost" data-cert-delete="${certification.id}" type="button">Delete</button>
                ${certification.certificateFile?.downloadUrl ? `<a class="button button-ghost" href="${certification.certificateFile.downloadUrl}" target="_blank" rel="noreferrer">Open file</a>` : ""}
            </div>
        </article>
    `).join("") || emptyMarkup(certifications.length ? "No certifications match the selected filters." : "No certifications found.");
    filtered.forEach((certification) => {
        document.querySelector(`[data-cert-edit="${certification.id}"]`)?.addEventListener("click", () => {
            state.editingCertificationId = certification.id;
            state.currentCertification = certification;
            openCertificationEditor();
            fillForm(document.getElementById("certification-form"), certification);
        });
        document.querySelector(`[data-cert-delete="${certification.id}"]`)?.addEventListener("click", async () => {
            if (!confirmDanger(`Delete certification "${certification.title}"? This cannot be undone.`)) {
                return;
            }
            await certificationsApi.remove(certification.id);
            await loadCertificationsAdmin();
        });
    });
}

function renderProjectForm() {
    const form = document.getElementById("project-form");
    if (!form) return;
    form.innerHTML = `
        <label><span>Title</span><input class="input" name="title" required maxlength="150" placeholder="Enter project title"></label>
        <label><span>Short description</span><input class="input" name="shortDescription" required maxlength="250" placeholder="Brief summary of the project"></label>
        <label><span>Detailed description</span><textarea class="input textarea" name="detailedDescription" required placeholder="Detailed info about the project..."></textarea></label>
        <label><span>Technologies</span><input class="input" name="technologies" required maxlength="500" placeholder="e.g. Java, Spring Boot, React (comma separated)"></label>
        <label><span>GitHub URL</span><input class="input" name="githubUrl" placeholder="https://github.com/..."></label>
        <label><span>Live URL</span><input class="input" name="liveUrl" placeholder="https://..."></label>
        <label><span>Image URL</span><input class="input" name="imageUrl" placeholder="https://..."></label>
        <div class="field-grid">
            <label><span>Category</span><select class="input" name="category">${markupOptions(PROJECT_CATEGORIES)}</select></label>
            <label><span>Status</span><select class="input" name="status">${markupOptions(PROJECT_STATUSES)}</select></label>
        </div>
        <div class="field-grid">
            <label><span>Completion Date</span><input class="input" type="date" name="completionDate"></label>
            <label><span>Project Image Upload</span><input class="input" type="file" name="projectImage" accept=".png,.jpg,.jpeg,.webp"></label>
        </div>
        <label><span><input type="checkbox" name="displayed" checked> Display in portfolio</span></label>
        <label><span><input type="checkbox" name="featured"> Featured project</span></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-check" style="margin-right:6px;"></i>${state.editingProjectId ? "Update" : "Create"}</button>
            <button id="project-reset" class="button button-ghost" type="button">Cancel</button>
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
    modal.querySelector(".input")?.focus();
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
    const technologies = (project.technologies || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const rows = [
        { label: "Category", value: project.category || "Project" },
        { label: "Status", value: project.status || "Unknown" },
        { label: "Featured", value: project.featured ? "Yes" : "No" },
        { label: "Displayed", value: isDisplayedValue(project.displayed) ? "Yes" : "No" },
        { label: "Completed", value: project.completionDate || "In progress" },
        { label: "Stack", value: `${technologies.length} tech${technologies.length === 1 ? "" : "s"}` }
    ];
    return `
        <div class="project-detail-shell">
            <div class="project-detail-header">
                <div>
                    <p class="eyebrow" style="color: var(--accent-alt); margin-bottom: 8px;">PROJECT DETAILS</p>
                    <h2 style="margin: 0;">${project.title}</h2>
                </div>
                <span class="chip">${project.displayed === false ? "Hidden" : "Displayed"}</span>
            </div>
            <div class="project-detail-grid">
                ${rows.map((row) => `
                    <article class="project-detail-card">
                        <span>${row.label}</span>
                        <strong>${row.value}</strong>
                    </article>
                `).join("")}
            </div>
            <div class="project-detail-body">
                <p>${project.shortDescription || ""}</p>
                <p>${project.detailedDescription || ""}</p>
                <div class="chip-row" style="margin-top: 4px;">
                    ${technologies.map((tech) => `<span class="chip">${tech}</span>`).join("")}
                </div>
            </div>
            <div class="project-detail-actions">
                <button class="button button-primary" type="button" data-project-notes-open="true">Notes</button>
                ${project.githubUrl ? `<a class="button button-outline" href="${project.githubUrl}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                ${project.liveUrl ? `<a class="button button-outline" href="${project.liveUrl}" target="_blank" rel="noreferrer">Live</a>` : ""}
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
    title.textContent = project.title || "Project details";
    content.innerHTML = buildProjectDetailMarkup(project);
    content.querySelector("[data-project-notes-open]")?.addEventListener("click", async () => {
        closeProjectDetail();
        await openProjectNotes(project);
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

function renderProjectNoteForm(note = null, formId = "project-note-form") {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    const isEditing = Boolean(note);
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
    const filtered = filterProjectNotes(notes, {
        search: options.search ?? document.getElementById(options.searchId || "project-notes-search")?.value,
        pinnedOnly: options.pinnedOnly ?? document.getElementById(options.pinnedOnlyId || "project-notes-pinned-only")?.checked,
        type: options.type ?? (document.getElementById(options.typeId || "")?.value || "")
    });
    const sorted = sortProjectNotes(filtered, options.sort ?? (document.getElementById(options.sortId || "")?.value || "createdAt_DESC"));
    const limited = typeof options.limit === "number" ? sorted.slice(0, options.limit) : sorted;
    const showActions = options.showActions !== false;
    container.innerHTML = limited.length ? limited.map((note) => `
        <article class="note-card ${note.pinned ? "is-pinned" : ""}">
            <header class="note-card-header">
                <div>
                    <p class="eyebrow note-type-label">${formatEnumLabel(note.type)}</p>
                    <h3>${escapeHtml(note.title)}</h3>
                </div>
                <div class="note-card-meta">
                    ${note.pinned ? '<span class="chip">Pinned</span>' : ""}
                    <span class="chip">${formatTimestamp(note.createdAt)}</span>
                    ${(note.updatedAt && note.updatedAt !== note.createdAt) ? `<span class="chip">Edited ${formatTimestamp(note.updatedAt)}</span>` : ""}
                </div>
            </header>
            <p class="note-card-content">${escapeHtml(note.content)}</p>
            <div class="chip-row note-tag-row">
                ${parseTags(note.tags).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
            </div>
            ${showActions ? `
                <div class="table-actions">
                    <button class="button button-ghost" data-note-edit="${note.id}" type="button">Edit</button>
                    <button class="button button-ghost" data-note-delete="${note.id}" type="button">Delete</button>
                </div>
            ` : ""}
        </article>
    `).join("") : emptyMarkup(options.emptyMessage || "No notes recorded yet. Add the first one to begin your project log.");

    if (!showActions) {
        return;
    }
    limited.forEach((note) => {
        document.querySelector(`[data-note-edit="${note.id}"]`)?.addEventListener("click", () => {
            state.editingProjectNoteId = note.id;
            renderProjectNoteForm(note, options.formId || "project-note-form");
            document.getElementById(options.formId || "project-note-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        document.querySelector(`[data-note-delete="${note.id}"]`)?.addEventListener("click", async () => {
            if (!confirmDanger(`Delete note "${note.title}"? This cannot be undone.`)) {
                return;
            }
            await projectsApi.removeNote(state.currentProject.id, note.id);
            await refreshProjectNotesSurface(options);
        });
    });
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
                content: normalizeValue(fd.get("content")),
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
                            <button class="note-action-btn delete-btn" type="button" data-id="${note.id}"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Bind ellipsis actions
    listContainer.querySelectorAll(".note-actions-trigger").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close all other dropdowns
            listContainer.querySelectorAll(".note-actions-dropdown").forEach(dropdown => {
                if (dropdown !== btn.nextElementSibling) {
                    dropdown.classList.add("hidden");
                }
            });
            btn.nextElementSibling.classList.toggle("hidden");
        });
    });

    // Edit action
    listContainer.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const noteId = btn.getAttribute("data-id");
            const note = state.currentProjectNotes.find(n => String(n.id) === String(noteId));
            if (note) {
                state.editingProjectNoteId = note.id;
                document.getElementById("quick-note-title").value = note.title || "";
                document.getElementById("quick-note-content").value = note.content || "";
                document.getElementById("quick-note-status").value = note.type || "PENDING";
                
                const form = document.getElementById("project-notes-quick-form");
                const submitBtn = form.querySelector(".quick-add-btn");
                if (submitBtn) submitBtn.textContent = "Save Note";
                
                document.getElementById("quick-note-title").focus();
            }
        });
    });

    // Delete action
    listContainer.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const noteId = btn.getAttribute("data-id");
            if (confirmDanger("Are you sure you want to delete this note?")) {
                try {
                    await projectsApi.removeNote(state.currentProject.id, noteId);
                    await refreshRedesignedNotes();
                } catch (error) {
                    alert("Failed to delete note: " + error.message);
                }
            }
        });
    });
}

// Global click listener to close dropdowns
document.addEventListener("click", () => {
    document.querySelectorAll(".note-actions-dropdown").forEach(dropdown => {
        dropdown.classList.add("hidden");
    });
});

async function openProjectNotes(project) {
    const modal = document.getElementById("project-notes-modal");
    if (!modal) return;
    
    state.currentProject = project;
    state.editingProjectNoteId = null;
    notesFilter = "ALL";
    notesSort = "createdAt_DESC";

    // Set header details
    const headerTitle = document.getElementById("project-notes-header-title");
    const headerDesc = document.getElementById("project-notes-header-desc");
    const avatarContainer = document.getElementById("project-notes-avatar");
    const statusSelect = document.getElementById("project-notes-status-select");
    
    if (headerTitle) headerTitle.textContent = project.title || "Project";
    if (headerDesc) headerDesc.textContent = project.shortDescription || "";
    if (avatarContainer) {
        if (project.imageUrl || (project.imageFile && project.imageFile.downloadUrl)) {
            avatarContainer.innerHTML = `<img src="${project.imageFile?.downloadUrl || project.imageUrl}" alt="" class="project-avatar-img">`;
        } else {
            const initials = (project.title || "P").substring(0, 2).toUpperCase();
            avatarContainer.innerHTML = `<div class="project-avatar-initials">${initials}</div>`;
        }
    }
    if (statusSelect) {
        statusSelect.value = project.status || "PLANNED";
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Reset quick add form
    const quickForm = document.getElementById("project-notes-quick-form");
    if (quickForm) {
        quickForm.reset();
        const submitBtn = quickForm.querySelector(".quick-add-btn");
        if (submitBtn) submitBtn.textContent = "Add Note";
    }

    // Load and render
    await refreshRedesignedNotes();
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
    const summary = document.getElementById("project-notes-page-summary");
    const list = document.getElementById("project-notes-page-list");
    const typeSelect = document.getElementById("project-notes-page-type");
    const form = document.getElementById("project-notes-page-form");
    if (!projectId) {
        document.querySelector(".project-notes-page-grid")?.classList.add("is-hidden");
        const projectsResponse = await projectsApi.getAdmin({ page: 0, size: 50, sortBy: "createdAt", sortDirection: "DESC" });
        const projects = projectsResponse.data?.content || [];
        hero.innerHTML = `
            <div class="form-hero" style="padding-top: 0;">
                <div>
                    <p class="eyebrow">Project Notes Archive</p>
                    <h2>Select a project</h2>
                    <p class="form-help">Choose a project to inspect, filter, and edit the full note history.</p>
                </div>
                <span class="chip">${projects.length} loaded</span>
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

    document.querySelector(".project-notes-page-grid")?.classList.remove("is-hidden");
    typeSelect.innerHTML = markupOptions(PROJECT_NOTE_TYPES, true);
    const projectResponse = await projectsApi.getAdminById(projectId);
    state.currentProject = projectResponse.data;
    const backLink = document.getElementById("project-notes-back");
    if (backLink) {
        backLink.href = "/api/v1/admin/projects.html";
        backLink.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "/api/v1/admin/projects.html";
        });
    }

    hero.innerHTML = `
        <div class="form-hero" style="padding-top: 0;">
            <div>
                <p class="eyebrow">Project Notes Archive</p>
                <h2>${escapeHtml(state.currentProject.title || "Project")}</h2>
                <p class="form-help">${escapeHtml(state.currentProject.shortDescription || "Browse every note, filter the history, and study how the project evolved.")}</p>
            </div>
            <span class="chip">${formatEnumLabel(state.currentProject.status || "UNKNOWN")}</span>
        </div>
        <div class="notes-summary-grid">
            <article class="notes-summary-card">
                <span class="muted-label">Technologies</span>
                <strong>${parseTags(state.currentProject.technologies).length}</strong>
                <p class="section-copy">${parseTags(state.currentProject.technologies).slice(0, 6).join(", ") || "No technologies listed"}</p>
            </article>
            <article class="notes-summary-card">
                <span class="muted-label">Quick Add</span>
                <strong>Live</strong>
                <p class="section-copy">Use the composer to log new features and decisions without leaving the archive.</p>
            </article>
        </div>
    `;

    renderProjectNoteForm(null, "project-notes-page-form");
    bindProjectNoteComposer("project-notes-page-form", async () => {
        await loadProjectNotesArchive();
    });

    const filters = ["project-notes-page-search", "project-notes-page-type", "project-notes-page-sort", "project-notes-page-pinned"];
    filters.forEach((id) => {
        document.getElementById(id).addEventListener("input", async () => {
            await loadProjectNotesArchive();
        });
        document.getElementById(id).addEventListener("change", async () => {
            await loadProjectNotesArchive();
        });
    });

    async function loadProjectNotesArchive() {
        summary.innerHTML = `<div class="notes-loading">Loading archive...</div>`;
        list.innerHTML = `<div class="notes-loading">Loading notes...</div>`;
        try {
            const notes = await fetchProjectNotes(projectId);
            state.currentProjectNotes = notes;
            const filtered = filterProjectNotes(notes, {
                search: document.getElementById("project-notes-page-search").value,
                type: document.getElementById("project-notes-page-type").value,
                pinnedOnly: document.getElementById("project-notes-page-pinned").checked
            });
            const sortValue = document.getElementById("project-notes-page-sort").value;
            const sorted = sortProjectNotes(filtered, sortValue);
            summary.innerHTML = renderProjectNotesSummary(state.currentProject, sorted);
            renderProjectNotesList(sorted, {
                summaryId: "project-notes-page-summary",
                containerId: "project-notes-page-list",
                searchId: "project-notes-page-search",
                typeId: "project-notes-page-type",
                pinnedOnlyId: "project-notes-page-pinned",
                sortId: "project-notes-page-sort",
                formId: "project-notes-page-form",
                showActions: true,
                emptyMessage: notes.length ? "No notes match the selected filters." : "No notes recorded yet. Add the first one to begin your archive."
            });
        } catch (error) {
            summary.innerHTML = emptyMarkup(error.message || "Unable to load notes archive.");
            list.innerHTML = emptyMarkup("Unable to load notes archive.");
        }
    }

    await loadProjectNotesArchive();
}

async function loadProjectsAdmin() {
    const visibility = document.getElementById("admin-project-visibility")?.value || "";
    const response = await projectsApi.getAdmin({
        page: state.projectPage,
        size: state.projectSize,
        search: document.getElementById("admin-project-search").value.trim(),
        category: document.getElementById("admin-project-category").value,
        status: document.getElementById("admin-project-status").value,
        displayed: visibility === "displayed" ? true : visibility === "hidden" ? false : ""
    });
    const data = response.data;
    document.getElementById("admin-project-list").innerHTML = (data.content || []).map((project, index) => `
        <article class="table-card admin-project-card">
            <header>
                <div>
                    <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                    <strong>${project.title}</strong>
                    <p class="section-copy">${project.shortDescription}</p>
                </div>
                <span class="chip">${project.displayed === false ? "Hidden" : "Displayed"}</span>
            </header>
            <div class="admin-project-body">
                <div class="admin-project-summary">
                    <p class="section-copy">${project.detailedDescription || project.shortDescription}</p>
                </div>
            </div>
            <div class="chip-row">
                <span class="chip">${project.category}</span>
                ${project.featured ? '<span class="chip">Featured</span>' : ""}
                ${project.completionDate ? `<span class="chip">${project.completionDate}</span>` : ""}
            </div>
            <div class="table-actions">
                <button class="button button-ghost" data-project-view="${project.id}" type="button">View project</button>
                <button class="button button-primary button-notes" data-project-notes="${project.id}" type="button">Notes</button>
                <a class="button button-ghost" href="/api/v1/admin/project-notes.html?projectId=${project.id}" data-project-notes-view="${project.id}">View notes</a>
                <button class="button button-ghost" data-project-edit="${project.id}" type="button">Edit</button>
                <button class="button button-ghost" data-project-delete="${project.id}" type="button">Delete</button>
            </div>
        </article>
    `).join("") || emptyMarkup("No projects found.");
    document.getElementById("admin-project-page-label").textContent = `Page ${data.page + 1} of ${Math.max(data.totalPages, 1)}`;
    document.getElementById("admin-project-prev").disabled = data.first;
    document.getElementById("admin-project-next").disabled = data.last;

    (data.content || []).forEach((project) => {
        document.querySelector(`[data-project-edit="${project.id}"]`)?.addEventListener("click", () => {
            state.editingProjectId = project.id;
            state.currentProject = project;
            openProjectEditor();
            fillForm(document.getElementById("project-form"), project);
        });
        document.querySelector(`[data-project-view="${project.id}"]`)?.addEventListener("click", () => {
            openProjectDetail(project);
        });
        document.querySelector(`[data-project-notes="${project.id}"]`)?.addEventListener("click", () => {
            openProjectNotes(project);
        });
        document.querySelector(`[data-project-notes-view="${project.id}"]`)?.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = `/api/v1/admin/project-notes.html?projectId=${project.id}`;
        });
        document.querySelector(`[data-project-delete="${project.id}"]`)?.addEventListener("click", async () => {
            if (!confirmDanger(`Delete "${project.title}"? This cannot be undone.`)) {
                return;
            }
            await projectsApi.remove(project.id);
            await loadProjectsAdmin();
        });
    });
}

function bindProjectForm() {
    const form = document.getElementById("project-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            let imageFileId = state.currentProject?.imageFile?.id ?? null;
            const isEditing = Boolean(state.editingProjectId);
            const confirmLabel = isEditing
                ? `Update "${normalizeValue(fd.get("title")) || state.currentProject?.title || "this project"}"?`
                : `Create "${normalizeValue(fd.get("title")) || "this project"}"?`;
            if (!confirmDanger(confirmLabel)) {
                return;
            }
            const upload = fd.get("projectImage");
            if (upload && upload.size) {
                const uploadResponse = await filesApi.upload(upload, "PROJECT_IMAGE");
                imageFileId = uploadResponse.data.id;
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
                completionDate: fd.get("completionDate") || null,
                imageFileId
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
    document.getElementById("project-reset").addEventListener("click", () => {
        closeProjectEditor();
    });
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

    document.getElementById("admin-project-category").innerHTML = markupOptions(PROJECT_CATEGORIES, true);
    document.getElementById("admin-project-status").innerHTML = markupOptions(PROJECT_STATUSES, true);
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
    document.addEventListener("keydown", (event) => {
        const detailModal = document.getElementById("project-detail-modal");
        if (event.key === "Escape" && detailModal && !detailModal.classList.contains("hidden")) {
            closeProjectDetail();
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
            <label><span>Display order</span><input class="input" type="number" name="displayOrder" min="0" required></label>
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
            payload.displayOrder = Number(payload.displayOrder);
            payload.displayed = payload.displayed === "on";
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

async function loadSkillsAdmin() {
    const response = await skillsApi.listAdmin(document.getElementById("admin-skill-category").value);
    const skills = response.data || [];
    const visibility = document.getElementById("admin-skill-visibility")?.value || "";
    const filtered = skills.filter((skill) => {
        const isVisible = skill.displayed !== false;
        return !visibility
            || (visibility === "displayed" && isVisible)
            || (visibility === "hidden" && !isVisible);
    });
    document.getElementById("admin-skill-list").innerHTML = filtered.map((skill, index) => `
        <article class="table-card admin-skill-card">
            <header>
                <div>
                    <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                    <strong>${skill.skillName}</strong>
                    <p class="section-copy">Order ${skill.displayOrder}</p>
                </div>
                <span class="chip">${skill.displayed === false ? "Hidden" : "Displayed"}</span>
            </header>
            <div class="chip-row">
                <span class="chip">${skill.category}</span>
            </div>
            <div class="admin-skill-metric">
                <span>Proficiency</span>
                <strong>${skill.proficiencyPercentage}%</strong>
            </div>
            <div class="skill-bar-container">
                <div class="skill-progress-bg">
                    <div class="skill-progress-fill" style="width: ${skill.proficiencyPercentage}%;"></div>
                </div>
            </div>
            <div class="table-actions">
                <button class="button button-ghost" data-skill-edit="${skill.id}" type="button">Edit</button>
                <button class="button button-ghost" data-skill-delete="${skill.id}" type="button">Delete</button>
            </div>
        </article>
    `).join("") || emptyMarkup("No skills found.");
    skills.forEach((skill) => {
        document.querySelector(`[data-skill-edit="${skill.id}"]`)?.addEventListener("click", () => {
            state.editingSkillId = skill.id;
            openSkillEditor();
            fillForm(document.getElementById("skill-form"), skill);
        });
        document.querySelector(`[data-skill-delete="${skill.id}"]`)?.addEventListener("click", async () => {
            if (!confirmDanger(`Delete skill "${skill.skillName}"? This cannot be undone.`)) {
                return;
            }
            await skillsApi.remove(skill.id);
            await refreshSkillsCache();
            await loadSkillsAdmin();
        });
    });
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

    document.getElementById("admin-skill-category").innerHTML = markupOptions(SKILL_CATEGORIES, true);
    document.getElementById("admin-skill-category").addEventListener("change", loadSkillsAdmin);
    document.getElementById("admin-skill-visibility")?.addEventListener("change", loadSkillsAdmin);
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
                <button class="message-queue-btn ${state.messageQueue === "inbox" ? "active" : ""}" type="button" data-message-queue="inbox">
                    Inbox <span>${inboxCount}</span>
                </button>
                <button class="message-queue-btn ${state.messageQueue === "starred" ? "active" : ""}" type="button" data-message-queue="starred">
                    Starred <span>${starredCount}</span>
                </button>
                <button class="message-queue-btn ${state.messageQueue === "archived" ? "active" : ""}" type="button" data-message-queue="archived">
                    Archived <span>${archivedCount}</span>
                </button>
                <button class="message-queue-btn ${state.messageQueue === "deleted" ? "active" : ""}" type="button" data-message-queue="deleted">
                    Deleted <span>${deletedCount}</span>
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
    const isArchivedQueue = queue === "archived";
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

function renderMessagesAdmin(messages) {
    const filtered = filterMessages(getMessageSource());
    document.getElementById("message-list").innerHTML = filtered.map((message, index) => `
        <article class="admin-message-thread ${message.readStatus ? "" : "is-unread"} ${message.starred ? "is-starred" : ""} ${message.archived ? "is-archived" : ""}">
            <div class="admin-message-avatar">${escapeHtml((message.name || "A").trim().charAt(0).toUpperCase())}</div>
            <div class="admin-message-content">
                <header class="admin-message-header">
                    <div class="admin-message-title-block">
                        <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                        <strong>${escapeHtml(message.subject || "No subject")}</strong>
                        <p class="section-copy admin-message-meta">${escapeHtml(message.name || "Anonymous")} | ${escapeHtml(message.email || "Email not provided")}</p>
                    </div>
                    <div class="admin-message-flags">
                        ${message.starred ? '<span class="chip chip-starred"><i class="fa-solid fa-star"></i> Starred</span>' : ""}
                        ${message.archived ? '<span class="chip chip-archive"><i class="fa-solid fa-box-archive"></i> Archived</span>' : ""}
                        <span class="chip">${message.deleted ? "Deleted" : (message.readStatus ? "Read" : "Unread")}</span>
                    </div>
                </header>
                <div class="admin-message-summary">
                    <p class="section-copy admin-message-preview">${escapeHtml(message.message || "No message content provided.")}</p>
                    <div class="chip-row admin-message-chip-row">
                        <span class="chip">${formatMessageDate(message.createdAt)}</span>
                        <span class="chip">${escapeHtml(message.email || "No email")}</span>
                    </div>
                </div>
                <div class="table-actions admin-message-actions">
                    <button class="button button-primary" data-message-view="${message.id}" type="button">View</button>
                    ${renderMessageActionMarkup(message, state.messageQueue, "card")}
                </div>
            </div>
            <div class="admin-message-aside">
                <span class="muted-label">Message state</span>
                <strong>${message.deleted ? "Deleted" : (message.archived ? "Archived" : (message.readStatus ? "Read" : "Unread"))}</strong>
                <p class="section-copy">${formatMessageDate(message.createdAt)}</p>
            </div>
        </article>
    `).join("") || emptyMarkup(getMessageSource().length ? "No messages match the selected filters." : "No messages found.");
    filtered.forEach((message) => {
        document.querySelector(`[data-message-view="${message.id}"]`)?.addEventListener("click", () => {
            openMessageDetail(message);
        });
        document.querySelector(`[data-message-toggle-read="${message.id}"]`)?.addEventListener("click", async (event) => {
            const action = event.currentTarget.dataset.action;
            if (action === "read") {
                await contactApi.markRead(message.id);
            } else {
                await contactApi.markUnread(message.id);
            }
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-toggle-star="${message.id}"]`)?.addEventListener("click", async (event) => {
            const action = event.currentTarget.dataset.action;
            if (action === "star") {
                await contactApi.star(message.id);
            } else {
                await contactApi.unstar(message.id);
            }
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-toggle-archive="${message.id}"]`)?.addEventListener("click", async (event) => {
            const action = event.currentTarget.dataset.action;
            if (action === "archive") {
                await contactApi.archive(message.id);
            } else {
                await contactApi.unarchive(message.id);
            }
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-delete="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.remove(message.id);
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-restore="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.restore(message.id);
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-purge="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.purge(message.id);
            await refreshMessagesData();
        });
    });
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
                <p class="form-help">Structure the profile like a corporate portfolio: clear identity, contact details, and link hygiene.</p>
            </div>
            <span class="chip">Public profile source</span>
        </div>
        <div class="field-grid">
            <label><span>Name</span><input class="input" name="name" required></label>
            <label><span>Designation</span><input class="input" name="designation" required></label>
        </div>
        <label><span>Biography</span><textarea class="input textarea" name="biography" required></textarea></label>
        <div class="field-grid">
            <label><span>Experience Years</span><input class="input" type="number" name="experienceYears" min="0" required></label>
            <label><span>Current Location</span><input class="input" name="currentLocation" required></label>
        </div>
        <div class="field-grid">
            <label><span>Email</span><input class="input" type="email" name="email" required></label>
            <label><span>Phone</span><input class="input" name="phone"></label>
        </div>
        <div class="field-grid">
            <label><span>LinkedIn URL</span><input class="input" name="linkedinUrl"></label>
            <label><span>GitHub URL</span><input class="input" name="githubUrl"></label>
        </div>
        <label><span>Portfolio URL</span><input class="input" name="portfolioUrl"></label>
        <label><span>Profile Image URL</span><input class="input" name="profileImageUrl" placeholder="/api/v1/assets/images/profile-placeholder.jpg"></label>
        <label><span>Headline ticker items</span><textarea class="input textarea" name="headlineTicker" placeholder="System Architecture, Backend Engineering, REST APIs, JWT Security, Microservices"></textarea></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit"><i class="fa-solid fa-check" style="margin-right:6px;"></i>Save profile</button>
        </div>
    `;
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

async function initResume() {
    const form = document.getElementById("resume-form");
    form.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Upload Resume</p>
                <h2>Replace current resume</h2>
                <p class="form-help">Upload PDF, DOC, DOCX, TXT, or RTF files. The latest upload becomes the active resume automatically.</p>
            </div>
            <span class="chip">Document vault</span>
        </div>
        <label><span>Version Label</span><input class="input" name="versionLabel" value="latest" maxlength="80"></label>
        <label><span>Resume file</span><input class="input" type="file" name="file" accept=".pdf,.doc,.docx,.txt,.rtf" required></label>
        <p class="form-help">Accepted file types: PDF, DOC, DOCX, TXT, and RTF.</p>
        <div class="form-actions">
            <button class="button button-primary" type="submit">Upload resume</button>
        </div>
    `;

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
            document.getElementById("resume-metadata").innerHTML = data ? `
                <div class="summary-stack">
                    <div class="form-hero" style="padding-bottom: 0; border-bottom: 0;">
                        <div>
                            <p class="eyebrow">Current Resume</p>
                            <h2>${activeResume?.versionLabel || data.versionLabel}</h2>
                            <p class="form-help">One resume is always marked as the live display version for the public site.</p>
                        </div>
                        <span class="chip">${activeResume?.active ? "Displayed" : "Available"}</span>
                    </div>
                    <div class="summary-card">
                        <span class="muted-label">Active File</span>
                        <strong>${activeResume?.file?.originalFileName || data.file?.originalFileName || "Resume file"}</strong>
                        <p class="section-copy">${activeResume?.file?.contentType || data.file?.contentType || "Document"}${(activeResume?.file?.size || data.file?.size) ? ` | ${formatBytes(activeResume?.file?.size || data.file?.size)}` : ""}</p>
                        <p class="section-copy">Uploaded ${new Date(activeResume?.uploadedAt || data.uploadedAt).toLocaleString()}</p>
                    </div>
                    <div class="chip-row">
                        <span class="chip">Stored in backend</span>
                        <span class="chip">${resumes.length} version${resumes.length === 1 ? "" : "s"}</span>
                    </div>
                    <div class="table-actions">
                        <a class="button button-primary" href="${activeResume?.file?.downloadUrl || data.file?.downloadUrl || resumeApi.downloadUrl()}" target="_blank" rel="noreferrer">Open resume</a>
                        <a class="button button-ghost" href="${activeResume?.file?.downloadUrl || data.file?.downloadUrl || resumeApi.downloadUrl()}" download>Download</a>
                        <button class="button button-ghost" id="copy-resume-link" type="button">Copy link</button>
                    </div>
                </div>
            ` : emptyMarkup("No resume uploaded.");
            document.getElementById("copy-resume-link")?.addEventListener("click", async () => {
                const link = activeResume?.file?.downloadUrl || data?.file?.downloadUrl || resumeApi.downloadUrl();
                try {
                    await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                    setFormStatus(form, "Resume link copied to clipboard.", "success");
                } catch {
                    setFormStatus(form, "Could not copy the resume link.", "error");
                }
            });

            const listMarkup = resumes.map((resume) => `
                <article class="table-card ${resume.active ? "active-resume" : ""}">
                    <header>
                        <div>
                            <strong>${resume.versionLabel}</strong>
                            <p class="section-copy">${resume.file?.originalFileName || "Resume file"}</p>
                        </div>
                        <span class="chip">${resume.active ? "Displayed" : "Stored"}</span>
                    </header>
                    <div class="chip-row">
                        <span class="chip">${new Date(resume.uploadedAt).toLocaleDateString()}</span>
                        ${resume.file?.size ? `<span class="chip">${formatBytes(resume.file.size)}</span>` : ""}
                        ${resume.file?.contentType ? `<span class="chip">${resume.file.contentType}</span>` : ""}
                    </div>
                    <div class="table-actions">
                        ${resume.active
                            ? `<button class="button button-primary" type="button" disabled>Displayed</button>`
                            : `<button class="button button-primary" data-resume-display="${resume.id}" type="button">Display</button>`}
                        <a class="button button-ghost" href="${resume.file?.downloadUrl || resumeApi.downloadUrl()}" target="_blank" rel="noreferrer">Open</a>
                    </div>
                </article>
            `).join("") || emptyMarkup("No resume uploaded.");
            const listContainer = document.createElement("div");
            listContainer.className = "stack";
            listContainer.innerHTML = `
                <div class="form-hero" style="padding-bottom: 0; border-bottom: 0;">
                    <div>
                        <p class="eyebrow">Resume Versions</p>
                        <h2>Display selection</h2>
                        <p class="form-help">Choose which uploaded resume should appear on the public site.</p>
                    </div>
                    <span class="chip">Version history</span>
                </div>
                <div class="resume-version-list">${listMarkup}</div>
            `;
            document.getElementById("resume-metadata").append(listContainer);
            resumes.forEach((resume) => {
                document.querySelector(`[data-resume-display="${resume.id}"]`)?.addEventListener("click", async () => {
                    if (!confirmDanger(`Display "${resume.versionLabel}" on the public site?`)) {
                        return;
                    }
                    await resumeApi.display(resume.id);
                    await loadMetadata();
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
                            ? "Upload a file above and it will appear here with open and download actions."
                            : "Check the API response or refresh after confirming the backend is running."}
                    </span>
                </div>
            `;
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const fd = new FormData(form);
            const file = fd.get("file");
            if (!isAllowedDocument(file)) {
                throw new Error("Please upload a PDF, DOC, DOCX, TXT, or RTF file.");
            }
            await resumeApi.upload(file, fd.get("versionLabel"));
            setFormStatus(form, "Resume uploaded successfully.", "success");
            form.reset();
            form.elements.versionLabel.value = "latest";
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
