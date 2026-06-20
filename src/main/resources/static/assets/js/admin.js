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
    editingSkillId: null,
    editingCertificationId: null,
    currentProject: null,
    currentCertification: null,
    skillsCache: [],
    certificationsCache: [],
    aboutSnapshot: null,
    resumeSnapshot: null,
    messagesCache: []
};

function markupOptions(values, includeAll = false) {
    const source = includeAll ? ["", ...values] : values;
    return source.map((value) => `<option value="${value}">${value ? value.replaceAll("_", " ") : "All"}</option>`).join("");
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
    const collapsed = localStorage.getItem("pms-admin-sidebar") === "collapsed";
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
        localStorage.setItem("pms-admin-sidebar", isCollapsed ? "collapsed" : "expanded");
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
    `;
}

function filterCertifications(certifications) {
    const search = normalizeValue(document.getElementById("admin-cert-search")?.value).toLowerCase();
    const issuer = document.getElementById("admin-cert-issuer")?.value || "";
    const fileState = document.getElementById("admin-cert-file")?.value || "";

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
        return matchesSearch && matchesIssuer && matchesFile;
    });
}

function renderCertificationsAdmin(certifications) {
    const filtered = filterCertifications(certifications);
    document.getElementById("admin-certification-list").innerHTML = filtered.map((certification) => `
        <article class="table-card">
            <header>
                <div>
                    <strong>${certification.title}</strong>
                    <p class="section-copy">${certification.issuer}</p>
                </div>
                <span class="chip">${certification.expiryDate ? "Active" : "Open"}</span>
            </header>
            <div class="chip-row">
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
        <article class="table-card">
            <header>
                <div>
                    <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                    <strong>${project.title}</strong>
                    <p class="section-copy">${project.shortDescription}</p>
                </div>
                <span class="chip">${project.displayed === false ? "Hidden" : "Displayed"}</span>
            </header>
            <div class="chip-row">
                <span class="chip">${project.category}</span>
                ${project.featured ? '<span class="chip">Featured</span>' : ""}
                ${project.completionDate ? `<span class="chip">${project.completionDate}</span>` : ""}
            </div>
            <div class="table-actions">
                <button class="button button-ghost" data-project-view="${project.id}" type="button">View project</button>
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
    document.getElementById("admin-skill-list").innerHTML = skills.map((skill, index) => `
        <article class="table-card">
            <header>
                <div>
                    <span class="card-number">No ${String(index + 1).padStart(2, "0")}</span>
                    <strong>${skill.skillName}</strong>
                    <p class="section-copy">Order ${skill.displayOrder}</p>
                </div>
                <span class="chip">${skill.category}</span>
            </header>
            <div class="skill-bar-container">
                <div class="skill-header">
                    <span>Proficiency</span>
                    <span>${skill.proficiencyPercentage}%</span>
                </div>
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
                certificateFileId
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

function renderMessageControls(messages = []) {
    const container = document.getElementById("message-controls");
    if (!container) {
        return;
    }
    container.innerHTML = `
        <input id="admin-message-search" class="input" type="search" placeholder="Search sender, subject, or body">
        <select id="admin-message-status" class="input">
            <option value="">All messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
        </select>
    `;
}

function filterMessages(messages) {
    const search = normalizeValue(document.getElementById("admin-message-search")?.value).toLowerCase();
    const status = document.getElementById("admin-message-status")?.value || "";

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
    const filtered = filterMessages(messages);
    document.getElementById("message-list").innerHTML = filtered.map((message) => `
        <article class="message-card">
            <header>
                <div>
                    <strong>${message.subject}</strong>
                    <p class="section-copy">${message.name} | ${message.email}</p>
                </div>
                <span class="chip">${message.readStatus ? "Read" : "Unread"}</span>
            </header>
            <p>${message.message}</p>
            <div class="message-actions">
                ${message.readStatus ? "" : `<button class="button button-ghost" data-message-read="${message.id}" type="button">Mark as read</button>`}
                <button class="button button-ghost" data-message-delete="${message.id}" type="button">Delete</button>
            </div>
        </article>
    `).join("") || emptyMarkup(messages.length ? "No messages match the selected filters." : "No messages found.");
    filtered.forEach((message) => {
        document.querySelector(`[data-message-read="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.markRead(message.id);
            await refreshMessagesData();
        });
        document.querySelector(`[data-message-delete="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.remove(message.id);
            await refreshMessagesData();
        });
    });
}

async function refreshMessagesData() {
    const response = await contactApi.list();
    state.messagesCache = response.data || [];
    renderMessagesAdmin(state.messagesCache);
}

async function initMessages() {
    const response = await contactApi.list();
    state.messagesCache = response.data || [];
    renderMessageControls(state.messagesCache);
    renderMessagesAdmin(state.messagesCache);

    const controls = document.getElementById("message-controls");
    if (controls && !controls.dataset.bound) {
        controls.dataset.bound = "true";
        controls.addEventListener("input", () => {
            renderMessagesAdmin(state.messagesCache);
        });
        controls.addEventListener("change", () => {
            renderMessagesAdmin(state.messagesCache);
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
