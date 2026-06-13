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
    resumeSnapshot: null
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
    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <p class="eyebrow">Admin Console</p>
            <h2>PMS/OS</h2>
            <p class="sidebar-note">JWT-protected backend operations.</p>
        </div>
        <nav class="sidebar-links">
            ${links.map(([slug, label, icon]) => `
                <a class="sidebar-link ${slug === page ? "active" : ""}" href="/api/v1/admin/${slug}.html">
                    <i class="${icon}"></i> ${label}
                </a>
            `).join("")}
            <div style="flex-grow: 1;"></div>
            <a class="sidebar-link" href="/api/v1/index.html" style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Public Site
            </a>
        </nav>
    `;
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

function fillForm(form, values) {
    Object.entries(values).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (!field || field.type === "file") {
            return;
        }
        if (field.type === "checkbox") {
            field.checked = Boolean(value);
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
    document.getElementById("dashboard-projects").innerHTML = (data.recentProjects || []).map((project) => `
        <article class="project-card">
            <p class="eyebrow">${project.category}</p>
            <h3>${project.title}</h3>
            <p class="section-copy">${project.shortDescription}</p>
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

function renderProjectForm() {
    const form = document.getElementById("project-form");
    form.innerHTML = `
        <p class="eyebrow">Create or Update</p>
        <h2>${state.editingProjectId ? "Edit project" : "New project"}</h2>
        <label><span>Title</span><input class="input" name="title" required maxlength="150"></label>
        <label><span>Short description</span><input class="input" name="shortDescription" required maxlength="250"></label>
        <label><span>Detailed description</span><textarea class="input textarea" name="detailedDescription" required></textarea></label>
        <label><span>Technologies</span><input class="input" name="technologies" required maxlength="500"></label>
        <label><span>GitHub URL</span><input class="input" name="githubUrl"></label>
        <label><span>Live URL</span><input class="input" name="liveUrl"></label>
        <label><span>Image URL</span><input class="input" name="imageUrl"></label>
        <div class="field-grid">
            <label><span>Category</span><select class="input" name="category">${markupOptions(PROJECT_CATEGORIES)}</select></label>
            <label><span>Status</span><select class="input" name="status">${markupOptions(PROJECT_STATUSES)}</select></label>
        </div>
        <div class="field-grid">
            <label><span>Completion Date</span><input class="input" type="date" name="completionDate"></label>
            <label><span>Project Image Upload</span><input class="input" type="file" name="projectImage" accept=".png,.jpg,.jpeg,.webp"></label>
        </div>
        <label><span><input type="checkbox" name="featured"> Featured project</span></label>
        <div class="form-actions">
            <button class="button button-primary" type="submit">${state.editingProjectId ? "Update" : "Create"}</button>
            <button id="project-reset" class="button button-ghost" type="button">Reset</button>
        </div>
    `;
}

async function loadProjectsAdmin() {
    const response = await projectsApi.getAdmin({
        page: state.projectPage,
        size: state.projectSize,
        search: document.getElementById("admin-project-search").value.trim(),
        category: document.getElementById("admin-project-category").value,
        status: document.getElementById("admin-project-status").value
    });
    const data = response.data;
    document.getElementById("admin-project-list").innerHTML = (data.content || []).map((project) => `
        <article class="table-card">
            <header>
                <div>
                    <strong>${project.title}</strong>
                    <p class="section-copy">${project.shortDescription}</p>
                </div>
                <span class="chip">${project.status}</span>
            </header>
            <div class="chip-row">
                <span class="chip">${project.category}</span>
                ${project.featured ? '<span class="chip">Featured</span>' : ""}
                ${project.completionDate ? `<span class="chip">${project.completionDate}</span>` : ""}
            </div>
            <div class="table-actions">
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
            renderProjectForm();
            bindProjectForm();
            fillForm(document.getElementById("project-form"), project);
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
                completionDate: fd.get("completionDate") || null,
                imageFileId
            };
            if (isEditing) {
                await projectsApi.update(state.editingProjectId, payload);
            } else {
                await projectsApi.create(payload);
            }
            state.editingProjectId = null;
            state.currentProject = null;
            renderProjectForm();
            bindProjectForm();
            setFormStatus(document.getElementById("project-form"), isEditing ? "Project updated successfully." : "Project created successfully.", "success");
            await loadProjectsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });
    document.getElementById("project-reset").addEventListener("click", () => {
        state.editingProjectId = null;
        state.currentProject = null;
        renderProjectForm();
        bindProjectForm();
    });
}

async function initProjects() {
    renderProjectForm();
    bindProjectForm();
    document.getElementById("admin-project-category").innerHTML = markupOptions(PROJECT_CATEGORIES, true);
    document.getElementById("admin-project-status").innerHTML = markupOptions(PROJECT_STATUSES, true);
    ["admin-project-search", "admin-project-category", "admin-project-status"].forEach((id) => {
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
    await loadProjectsAdmin();
}

function renderSkillForm() {
    const form = document.getElementById("skill-form");
    form.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Skill Record</p>
                <h2>${state.editingSkillId ? "Edit skill" : "New skill"}</h2>
                <p class="form-help">Create button adds a skill only after submit. Skill names are case-insensitive and must stay unique.</p>
            </div>
            <span class="chip">MNC-style skill matrix</span>
        </div>
        <div class="field-grid">
            <label><span>Skill name</span><input class="input" name="skillName" required maxlength="100" placeholder="e.g. Java"></label>
            <label><span>Category</span><select class="input" name="category">${markupOptions(SKILL_CATEGORIES)}</select></label>
        </div>
        <div class="field-grid">
            <label><span>Proficiency percentage</span><input class="input" type="number" name="proficiencyPercentage" min="0" max="100" required></label>
            <label><span>Display order</span><input class="input" type="number" name="displayOrder" min="0" required></label>
        </div>
        <div class="form-actions">
            <button class="button button-primary" type="submit">${state.editingSkillId ? "Update" : "Create"}</button>
            <button id="skill-reset" class="button button-ghost" type="button">Reset</button>
        </div>
    `;
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
            state.editingSkillId = null;
            renderSkillForm();
            bindSkillForm();
            setFormStatus(document.getElementById("skill-form"), isEditing ? "Skill updated successfully." : "Skill created successfully.", "success");
            await refreshSkillsCache();
            await loadSkillsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });
    document.getElementById("skill-reset").addEventListener("click", () => {
        state.editingSkillId = null;
        renderSkillForm();
        bindSkillForm();
    });
}

async function loadSkillsAdmin() {
    const response = await skillsApi.listAdmin(document.getElementById("admin-skill-category").value);
    const skills = response.data || [];
    document.getElementById("admin-skill-list").innerHTML = skills.map((skill) => `
        <article class="table-card">
            <header>
                <div>
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
            renderSkillForm();
            bindSkillForm();
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
    renderSkillForm();
    bindSkillForm();
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
    form.innerHTML = `
        <div class="form-hero">
            <div>
                <p class="eyebrow">Certification Record</p>
                <h2>${state.editingCertificationId ? "Edit certification" : "New certification"}</h2>
                <p class="form-help">Capture issuer, validity, and proof in one pass. Duplicate title and issuer pairs are blocked automatically.</p>
            </div>
            <span class="chip">Verified credentials</span>
        </div>
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
            <button class="button button-primary" type="submit">${state.editingCertificationId ? "Update" : "Create"}</button>
            <button id="certification-reset" class="button button-ghost" type="button">Reset</button>
        </div>
    `;
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
            state.editingCertificationId = null;
            state.currentCertification = null;
            renderCertificationForm();
            bindCertificationForm();
            setFormStatus(document.getElementById("certification-form"), isEditing ? "Certification updated successfully." : "Certification created successfully.", "success");
            await loadCertificationsAdmin();
        } catch (error) {
            setFormStatus(form, error.message, "error");
        }
    });
    document.getElementById("certification-reset").addEventListener("click", () => {
        state.editingCertificationId = null;
        state.currentCertification = null;
        renderCertificationForm();
        bindCertificationForm();
    });
}

async function loadCertificationsAdmin() {
    const response = await certificationsApi.listAdmin();
    const certifications = response.data || [];
    state.certificationsCache = certifications;
    document.getElementById("admin-certification-list").innerHTML = certifications.map((certification) => `
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
    `).join("") || emptyMarkup("No certifications found.");
    certifications.forEach((certification) => {
        document.querySelector(`[data-cert-edit="${certification.id}"]`)?.addEventListener("click", () => {
            state.editingCertificationId = certification.id;
            state.currentCertification = certification;
            renderCertificationForm();
            bindCertificationForm();
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

async function initCertifications() {
    renderCertificationForm();
    bindCertificationForm();
    await loadCertificationsAdmin();
}

async function initMessages() {
    const response = await contactApi.list();
    const messages = response.data || [];
    document.getElementById("message-list").innerHTML = messages.map((message) => `
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
    `).join("") || emptyMarkup("No messages found.");
    messages.forEach((message) => {
        document.querySelector(`[data-message-read="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.markRead(message.id);
            await initMessages();
        });
        document.querySelector(`[data-message-delete="${message.id}"]`)?.addEventListener("click", async () => {
            await contactApi.remove(message.id);
            await initMessages();
        });
    });
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
                <p class="form-help">Keep the public profile and admin credentials behind explicit actions, just like a polished control plane.</p>
            </div>
            <span class="chip">Controlled access</span>
        </div>
        <div class="summary-grid">
            <div class="summary-card">
                <span class="muted-label">Current Profile</span>
                <strong>${state.aboutSnapshot?.name || "Loading..."}</strong>
                <p class="section-copy">${state.aboutSnapshot?.designation || "Loading..."}</p>
            </div>
            <div class="summary-card">
                <span class="muted-label">Security</span>
                <strong>${state.aboutSnapshot?.email || "Admin credential"}</strong>
                <p class="section-copy">Password change is available only through the action button.</p>
            </div>
        </div>
        <div class="table-actions" style="margin-top: 18px;">
            <button id="profile-edit-btn" class="button button-primary" type="button">Update profile</button>
            <button id="password-edit-btn" class="button button-ghost" type="button">Change password</button>
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
        <div class="form-actions">
            <button class="button button-primary" type="submit">Save profile</button>
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
            <button class="button button-primary" type="submit">Update password</button>
        </div>
    `;

    const [aboutResponse, meResponse] = await Promise.allSettled([aboutApi.getAdmin(), authApi.me()]);
    if (aboutResponse.status === "fulfilled") {
        state.aboutSnapshot = aboutResponse.value.data || {};
        fillForm(aboutForm, state.aboutSnapshot);
        profileSummary.querySelector(".summary-grid").innerHTML = `
            <div class="summary-card">
                <span class="muted-label">Current Profile</span>
                <strong>${state.aboutSnapshot.name || "Admin profile"}</strong>
                <p class="section-copy">${state.aboutSnapshot.designation || "No designation set"}</p>
                <p class="section-copy">${state.aboutSnapshot.currentLocation || "Location unavailable"}</p>
            </div>
            <div class="summary-card">
                <span class="muted-label">Public Links</span>
                <strong>${state.aboutSnapshot.email || "Email unavailable"}</strong>
                <p class="section-copy">${state.aboutSnapshot.githubUrl || "GitHub not linked"}</p>
            </div>
        `;
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
            profileSummary.querySelector(".summary-grid").innerHTML = `
                <div class="summary-card">
                    <span class="muted-label">Current Profile</span>
                    <strong>${payload.name || "Admin profile"}</strong>
                    <p class="section-copy">${payload.designation || "No designation set"}</p>
                    <p class="section-copy">${payload.currentLocation || "Location unavailable"}</p>
                </div>
                <div class="summary-card">
                    <span class="muted-label">Public Links</span>
                    <strong>${payload.email || "Email unavailable"}</strong>
                    <p class="section-copy">${payload.githubUrl || "GitHub not linked"}</p>
                </div>
            `;
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
            const response = await resumeApi.adminMetadata();
            const data = response.data;
            state.resumeSnapshot = data;
            document.getElementById("resume-metadata").innerHTML = data ? `
                <div class="summary-stack">
                    <div class="form-hero" style="padding-bottom: 0; border-bottom: 0;">
                        <div>
                            <p class="eyebrow">Current Resume</p>
                            <h2>${data.versionLabel}</h2>
                            <p class="form-help">Latest upload is active everywhere on the public site.</p>
                        </div>
                        <span class="chip">Live asset</span>
                    </div>
                    <div class="summary-card">
                        <span class="muted-label">File</span>
                        <strong>${data.file?.originalFileName || "Resume file"}</strong>
                        <p class="section-copy">${data.file?.contentType || "Document"}${data.file?.size ? ` | ${formatBytes(data.file.size)}` : ""}</p>
                        <p class="section-copy">Uploaded ${new Date(data.uploadedAt).toLocaleString()}</p>
                    </div>
                    <div class="chip-row">
                        <span class="chip">Stored in backend</span>
                        ${data.file?.fileType ? `<span class="chip">${String(data.file.fileType).replaceAll("_", " ")}</span>` : ""}
                    </div>
                    <div class="table-actions">
                        <a class="button button-primary" href="${data.file?.downloadUrl || resumeApi.downloadUrl()}" target="_blank" rel="noreferrer">Open resume</a>
                        <a class="button button-ghost" href="${data.file?.downloadUrl || resumeApi.downloadUrl()}" download>Download</a>
                        <button class="button button-ghost" id="copy-resume-link" type="button">Copy link</button>
                    </div>
                </div>
            ` : emptyMarkup("No resume uploaded.");
            document.getElementById("copy-resume-link")?.addEventListener("click", async () => {
                const link = data?.file?.downloadUrl || resumeApi.downloadUrl();
                try {
                    await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                    setFormStatus(form, "Resume link copied to clipboard.", "success");
                } catch {
                    setFormStatus(form, "Could not copy the resume link.", "error");
                }
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
