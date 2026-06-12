import { aboutApi } from "./api/about-api.js";
import { dashboardApi } from "./api/dashboard-api.js";
import { projectsApi } from "./api/projects-api.js";
import { skillsApi } from "./api/skills-api.js";
import { certificationsApi } from "./api/certifications-api.js";
import { resumeApi } from "./api/resume-api.js";
import { contactApi } from "./api/contact-api.js";
import { initTheme } from "./theme.js";
import { initNavigation } from "./navigation.js";
import { initAnimations } from "./animations.js";

const PROJECT_CATEGORIES = ["", "WEB", "MOBILE", "BACKEND", "FULL_STACK", "DEVOPS", "DATA", "OTHER"];
const PROJECT_STATUSES = ["", "PLANNED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"];

const state = {
    page: 0,
    size: 6,
    about: null,
    dashboard: null,
    projects: [],
    featuredProjects: [],
    skills: [],
    resume: null,
    projectFeaturedFilter: "",
    projectEscapeBound: false
};

function element(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const node = element(id);
    if (node) {
        node.textContent = value;
    }
}

function setHtml(id, value) {
    const node = element(id);
    if (node) {
        node.innerHTML = value;
    }
}

function setHref(id, value, fallback = "#") {
    const node = element(id);
    if (node) {
        node.href = value || fallback;
    }
}

function optionMarkup(values, label) {
    return values.map((value) => {
        const text = value || label;
        return `<option value="${value}">${text.replaceAll("_", " ")}</option>`;
    }).join("");
}

function uniqueById(items) {
    return [...new Map(items.filter(Boolean).map((item) => [projectKey(item), item])).values()];
}

function projectKey(project) {
    return [
        project.id ?? "",
        (project.title || "").trim().toLowerCase(),
        (project.category || "").trim().toLowerCase(),
        (project.status || "").trim().toLowerCase(),
        (project.shortDescription || "").trim().toLowerCase(),
        (project.technologies || "").trim().toLowerCase()
    ].join("|");
}

function splitTechnologies(project) {
    return (project.technologies || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatDate(value) {
    if (!value) {
        return "n/a";
    }
    return value.length > 10 ? value.substring(0, 10) : value;
}

function enumLabel(value, fallback = "Unknown") {
    return value ? value.replaceAll("_", " ") : fallback;
}

function projectGrade(project) {
    const technologies = splitTechnologies(project).length;
    const completed = project.status === "COMPLETED";
    const inProgress = project.status === "IN_PROGRESS";
    const points = (project.featured ? 2 : 0) + (completed ? 2 : inProgress ? 1 : 0) + (technologies >= 5 ? 2 : technologies >= 3 ? 1 : 0);
    if (points >= 5) {
        return "Enterprise A+";
    }
    if (points >= 3) {
        return "Enterprise A";
    }
    return "Production Ready";
}

function projectInsightRows(project) {
    const techs = splitTechnologies(project);
    return [
        { label: "Category", value: enumLabel(project.category, "Project") },
        { label: "Status", value: enumLabel(project.status) },
        { label: "Grade", value: projectGrade(project) },
        { label: "Stack", value: `${techs.length} tech${techs.length === 1 ? "" : "s"}` },
        { label: "Featured", value: project.featured ? "Yes" : "No" },
        { label: "Completed", value: project.completionDate ? formatDate(project.completionDate) : "In progress" }
    ];
}

function projectHighlights(project) {
    const raw = (project.detailedDescription || "").replace(/\r/g, "");
    if (!raw) {
        return [];
    }
    const parts = raw
        .split(/\n+|•|-/)
        .map((item) => item.trim())
        .filter(Boolean)
        .flatMap((item) => item.split(/[.?!]\s+/))
        .map((item) => item.trim())
        .filter(Boolean);

    return (parts.length ? parts : [raw])
        .slice(0, 3)
        .map((item) => item.replace(/^[-•\s]+/, ""));
}

function techChipMarkup(technologies) {
    const visible = technologies.slice(0, 3);
    const overflow = technologies.length - visible.length;
    return `
        ${visible.map((tech) => `<span class="chip">${tech}</span>`).join("")}
        ${overflow > 0 ? `<span class="chip chip-more">+${overflow}</span>` : ""}
    `;
}

function setStatus(node, message, type = "") {
    if (!node) {
        return;
    }
    node.textContent = message;
    node.className = `form-status ${type}`.trim();
}

function renderMetrics(metrics) {
    const heroMetricsContainer = element("hero-metrics");
    if (heroMetricsContainer) {
        heroMetricsContainer.innerHTML = metrics.map((metric) => `
            <div class="hero-metric-item">
                <span class="hero-metric-value">${metric.value}</span>
                <span class="hero-metric-label">${metric.label}</span>
            </div>
        `).join("");
    }

    const publicMetricsContainer = element("public-metrics");
    if (publicMetricsContainer) {
        publicMetricsContainer.innerHTML = metrics.map((metric) => `
            <article class="metric-card floating">
                <span class="muted-label">${metric.label}</span>
                <strong>${metric.value}</strong>
            </article>
        `).join("");
    }
}

function renderAbout(about) {
    state.about = about;
    setText("hero-name", about?.name || "Portfolio System");
    setText("hero-biography", about?.biography || "No biography available.");
    setText("overview-copy", about?.biography || "Awaiting about information.");
    setText("experience-years", `${about?.experienceYears || 0} years`);
    setText("hero-location", about?.currentLocation || "Unavailable");
    setText("hero-email", about?.email || "Unavailable");
    setText("hero-location-pill", about?.currentLocation || "Unavailable");
    setText("hero-profile-name", about?.name || "Loading...");
    setText("hero-profile-title", about?.designation || "Loading...");
    setText("hero-profile-title-inline", about?.designation || "Loading...");
    setHref("linkedin-link", about?.linkedinUrl);
    setText("linkedin-link", about?.linkedinUrl || "Unavailable");
    setHref("github-link", about?.githubUrl);
    setText("github-link", about?.githubUrl || "Unavailable");
    setHref("portfolio-link", about?.portfolioUrl);
    setText("portfolio-link", about?.portfolioUrl || "Unavailable");
    const heroHeader = element("hero-name-header");
    if (heroHeader && about?.name) {
        heroHeader.innerHTML = `Hi, I'm <span class="highlight-violet">${about.name}</span>.`;
    }
    setHref("header-github", about?.githubUrl);
    setHref("header-linkedin", about?.linkedinUrl);
}

function renderAboutMetrics(dashboard) {
    const metrics = [
        { id: "about-total-projects", value: dashboard?.totalProjects ?? 0 },
        { id: "about-featured-projects", value: dashboard?.totalFeaturedProjects ?? 0 },
        { id: "about-skills", value: dashboard?.totalSkills ?? 0 },
        { id: "about-certifications", value: dashboard?.totalCertifications ?? 0 },
        { id: "about-experience", value: `${state.about?.experienceYears ?? 0}y` },
        { id: "about-messages", value: dashboard?.totalMessages ?? 0 }
    ];

    metrics.forEach((metric) => setText(metric.id, metric.value));
}

function renderSkills(skills) {
    const byCategory = skills.reduce((accumulator, skill) => {
        const key = skill.category || "OTHER";
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(skill);
        return accumulator;
    }, {});

    setHtml("skill-clusters", Object.entries(byCategory).map(([category, items]) => `
        <article class="masonry-skill-card" data-reveal>
            <div class="skill-card-header">
                <h3>${category.replaceAll("_", " ")}</h3>
                <span class="skill-count">${items.length} skills</span>
            </div>
            <div class="skill-list-container">
                ${items.sort((a, b) => a.displayOrder - b.displayOrder).map((skill) => `
                    <div class="masonry-skill-item">
                        <div class="masonry-skill-header">
                            <span class="masonry-skill-name">${skill.skillName}</span>
                            <span class="masonry-skill-percent">${skill.proficiencyPercentage}%</span>
                        </div>
                        <div class="masonry-progress-track">
                            <div class="masonry-progress-fill" style="width: ${skill.proficiencyPercentage}%;"></div>
                        </div>
                    </div>
                `).join("")}
            </div>
        </article>
    `).join("") || `<div class="empty-state">No skills published yet.</div>`);
}

function projectCard(project, featured = false) {
    const image = project.imageFile?.downloadUrl || project.imageUrl;
    const technologies = splitTechnologies(project);
    const insightRows = projectInsightRows(project);
    return `
        <article class="project-card ${featured ? "featured" : ""}" data-project-card data-project-id="${project.id ?? ""}">
            <div class="project-card-media">
                ${image ? `<img src="${image}" alt="${project.title} preview">` : `<div class="project-card-fallback">No preview uploaded</div>`}
                <div class="project-card-top-strip">
                    <span class="project-card-badge">${enumLabel(project.status, "Project")}</span>
                    <span class="project-card-year">${project.completionDate ? project.completionDate.substring(0, 4) : "Live"}</span>
                </div>
            </div>
            <div class="project-card-body">
                <div class="project-card-topline">
                    <p class="eyebrow">${enumLabel(project.category, "Project")}</p>
                    <span class="project-card-grade">${projectGrade(project)}</span>
                </div>
                <h3>${project.title}</h3>
                <p class="section-copy">${project.shortDescription}</p>
                <div class="chip-row">${techChipMarkup(technologies)}</div>
                <div class="project-card-actions">
                    <button class="button button-ghost project-more-toggle" type="button" aria-expanded="false">View more</button>
                    ${project.githubUrl ? `<a class="button button-outline" href="${project.githubUrl}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                    ${project.liveUrl ? `<a class="button button-outline" href="${project.liveUrl}" target="_blank" rel="noreferrer">Live</a>` : ""}
                </div>
            </div>
            <div class="project-card-popup" aria-hidden="true">
                <div class="project-card-popup-header">
                    <div>
                        <span class="project-card-popup-kicker">Project details</span>
                        <strong>${project.title}</strong>
                    </div>
                    <button class="project-card-close" type="button" aria-label="Close details">×</button>
                </div>
                <div class="project-card-popup-grid">
                    ${insightRows.map((row) => `
                        <div class="project-insight">
                            <span>${row.label}</span>
                            <strong>${row.value}</strong>
                        </div>
                    `).join("")}
                </div>
                <p class="project-card-detail-copy">${project.detailedDescription || ""}</p>
                <div class="project-card-popup-actions">
                    ${project.githubUrl ? `<a class="button button-outline" href="${project.githubUrl}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                    ${project.liveUrl ? `<a class="button button-outline" href="${project.liveUrl}" target="_blank" rel="noreferrer">Live</a>` : ""}
                </div>
            </div>
        </article>
    `;
}

function renderFeaturedProjects(projects) {
    const uniqueProjects = uniqueById(projects).slice(0, 3);
    state.featuredProjects = uniqueProjects;
    setHtml("featured-projects", uniqueProjects.map((project) => projectCard(project, true)).join("") || `<div class="empty-state">No featured projects available.</div>`);
}

function renderTimeline(projects) {
    const aboutYears = state.about?.experienceYears || 0;
    const timeline = [...projects]
        .filter((project) => project.completionDate)
        .sort((a, b) => b.completionDate.localeCompare(a.completionDate))
        .map((project) => ({
            title: project.title,
            date: project.completionDate,
            detail: project.shortDescription
        }));

    if (aboutYears > 0) {
        timeline.push({
            title: "Experience baseline",
            date: `${new Date().getFullYear() - aboutYears}`,
            detail: `${aboutYears} years reported by the About API.`
        });
    }

    setHtml("timeline-list", timeline.map((item) => `
        <article class="timeline-item" data-reveal>
            <p class="eyebrow">${item.date}</p>
            <h3>${item.title}</h3>
            <p class="section-copy">${item.detail}</p>
        </article>
    `).join("") || `<div class="empty-state">Timeline data will appear when projects include completion dates.</div>`);
}

function renderProjectCatalog(pageData) {
    const uniqueProjects = uniqueById(pageData.content || []);
    const featuredKeys = new Set((state.featuredProjects || []).map(projectKey));
    state.projects = uniqueProjects.filter((project) => !featuredKeys.has(projectKey(project)) && !project.featured);
    setHtml("project-catalog", state.projects.map((project) => projectCard(project)).join("") || `<div class="empty-state">No projects matched this query.</div>`);
    setText("projects-page-label", `Page ${pageData.page + 1} of ${Math.max(pageData.totalPages, 1)}`);
    if (element("projects-prev")) {
        element("projects-prev").disabled = pageData.first;
    }
    if (element("projects-next")) {
        element("projects-next").disabled = pageData.last;
    }
    renderTimeline(state.projects);
    bindProjectInteractions();
}

function buildHtmlResume(certifications, resume) {
    const about = state.about || {};
    const featuredProjects = uniqueById([...state.featuredProjects, ...state.projects.filter((project) => project.featured)]).slice(0, 3);

    const skillsByCategory = state.skills.reduce((acc, skill) => {
        const category = skill.category || "OTHER";
        acc[category] = acc[category] || [];
        acc[category].push(skill.skillName);
        return acc;
    }, {});

    const skillRows = Object.entries(skillsByCategory).map(([category, skills]) => `
        <div class="resume-skill-row">
            <div class="resume-skill-label">${category.replaceAll("_", " ")}</div>
            <div class="resume-skill-values">${skills.join(" | ")}</div>
        </div>
    `).join("");

    const certList = certifications.map((certification) => `
        <li class="resume-list-item">
            <div class="resume-list-title">${certification.title}</div>
            <div class="resume-list-meta">${certification.issuer} - ${certification.issueDate ? certification.issueDate.substring(0, 4) : "Present"}</div>
        </li>
    `).join("");

    const projList = featuredProjects.map((project) => `
        <div class="resume-project">
            <div class="resume-project-header">
                <span class="resume-project-title">${project.title}</span>
                <span class="resume-project-tags">${splitTechnologies(project).slice(0, 4).join(" | ")}</span>
            </div>
            <ul class="resume-bullet-list">
                <li>${project.shortDescription}</li>
                ${project.detailedDescription ? `<li>${project.detailedDescription}</li>` : ""}
            </ul>
        </div>
    `).join("");

    setHtml("resume-doc", `
        <div class="resume-header">
            <div>
                <h1>${about.name || "Koram Yashwanth Reddy"}</h1>
                <p>${about.designation || "Entry-Level Software Developer"} | Java | Spring Boot | Full Stack</p>
            </div>
            <div class="resume-contact">
                <div><i class="fa-regular fa-envelope"></i> ${about.email || "Unavailable"}</div>
                <div><i class="fa-solid fa-phone"></i> ${about.phone || "Unavailable"}</div>
                <div><i class="fa-solid fa-location-dot"></i> ${about.currentLocation || "Unavailable"}</div>
            </div>
        </div>

        <div class="resume-section">
            <div class="resume-section-title">Professional Summary</div>
            <div class="resume-summary">${about.biography || "Production-grade Java + Spring Boot engineer."}</div>
        </div>

        <div class="resume-grid resume-section">
            <div>
                <div class="resume-section-title">Technical Skills</div>
                ${skillRows}
            </div>
            <div>
                <div class="resume-section-title">Certifications</div>
                <ul class="resume-list">
                    ${certList}
                </ul>
            </div>
        </div>

        <div class="resume-section">
            <div class="resume-section-title">Featured Projects</div>
            ${projList}
        </div>

        <div class="resume-section">
            <div class="resume-section-title">Education</div>
            <div class="resume-education">
                <span class="resume-list-title">B.Sc. Computer Science</span>
                <span class="resume-education-school">CGPA 8.5 / 10.0 | Graduating May 2026</span>
            </div>
            <div class="resume-education-school" style="margin-top: 4px;">Loyola Academy Degree & PG College, Hyderabad</div>
        </div>

        <div class="resume-footer">
            <span><i class="fa-brands fa-github"></i> GitHub</span>
            <span><i class="fa-brands fa-linkedin"></i> LinkedIn</span>
            <span>Languages: English - Professional | Telugu - Native | Hindi - Fluent</span>
        </div>
    `);
}

function bindResumeModal(resume) {
    const modal = element("resume-modal");
    const closeBtn = element("modal-close-btn");
    const downloadBtn = element("modal-download-btn");
    const toggleStyled = element("toggle-styled");
    const togglePdf = element("toggle-pdf");
    const resumeDoc = element("resume-doc");
    const pdfViewer = element("resume-pdf-iframe");

    if (!modal || !closeBtn || !downloadBtn || !toggleStyled || !togglePdf || !resumeDoc || !pdfViewer) {
        return;
    }

    const downloadUrl = resume?.file?.downloadUrl || resumeApi.downloadUrl();
    downloadBtn.href = downloadUrl;
    pdfViewer.src = downloadUrl;

    document.querySelectorAll(".open-resume-modal").forEach((btn) => {
        btn.addEventListener("click", () => {
            modal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        });
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    });

    toggleStyled.addEventListener("click", () => {
        toggleStyled.classList.add("active");
        togglePdf.classList.remove("active");
        resumeDoc.style.display = "block";
        pdfViewer.classList.add("hidden");
    });

    togglePdf.addEventListener("click", () => {
        togglePdf.classList.add("active");
        toggleStyled.classList.remove("active");
        resumeDoc.style.display = "none";
        pdfViewer.classList.remove("hidden");
    });
}

function renderKnowledge(resume, certifications) {
    state.resume = resume;
    const actionsContainer = element("resume-actions-container");
    const previewWrapper = element("resume-preview-wrapper");
    if (!actionsContainer || !previewWrapper) {
        return;
    }

    const resumeUrl = resume?.file?.downloadUrl || "#knowledge";

    if (resume) {
        actionsContainer.innerHTML = `
            <button class="button button-primary open-resume-modal" style="border-radius: 99px;"><i class="fa-regular fa-eye"></i> View resume</button>
            <a class="button button-outline" style="border-radius: 99px;" href="${resumeUrl}" target="_blank" rel="noreferrer"><i class="fa-solid fa-download"></i> Download PDF</a>
        `;

        previewWrapper.innerHTML = `
            <div class="resume-preview-card open-resume-modal" style="cursor: pointer;">
                <div class="preview-eyebrow">Resume uploaded</div>
                <div class="preview-name">${state.about?.name || "Koram Yashwanth Reddy"}</div>
                <div class="preview-title">${state.about?.designation || "Entry-Level Software Developer"}</div>
                <div class="resume-preview-meta">${resume.versionLabel || "Latest"} | Uploaded ${formatDate(resume.uploadedAt)}</div>
                <div class="resume-preview-lines">
                    <div class="skeleton-line" style="width: 100%;"></div>
                    <div class="skeleton-line" style="width: 95%;"></div>
                    <div class="skeleton-line" style="width: 90%;"></div>
                    <div class="skeleton-line" style="width: 98%;"></div>
                </div>
                <div class="resume-preview-summary">
                    <span class="chip">${state.about?.currentLocation || "Location unavailable"}</span>
                    <span class="chip">${state.about?.experienceYears || 0} years</span>
                    <span class="chip">${resume.file?.originalFileName || "resume.pdf"}</span>
                </div>
            </div>
        `;

        buildHtmlResume(certifications, resume);
        bindResumeModal(resume);
    } else {
        actionsContainer.innerHTML = `<button class="button button-primary" disabled style="border-radius: 99px; opacity: 0.5;">No resume uploaded</button>`;
        previewWrapper.innerHTML = `<div class="empty-state">No resume is currently uploaded in the system.</div>`;
    }

    setHref("resume-download-link-hero", resumeUrl);

    setHtml("certification-grid", certifications.map((certification) => `
        <article class="project-card">
            <p class="eyebrow">${certification.issuer}</p>
            <h3>${certification.title}</h3>
            <p class="section-copy">Issued ${certification.issueDate || "n/a"}${certification.expiryDate ? ` | Expires ${certification.expiryDate}` : ""}</p>
            <div class="chip-row">
                ${certification.credentialId ? `<span class="chip">${certification.credentialId}</span>` : ""}
                ${certification.certificateFile?.downloadUrl ? `<a class="button button-ghost" href="${certification.certificateFile.downloadUrl}" target="_blank" rel="noreferrer">Open PDF</a>` : ""}
            </div>
        </article>
    `).join("") || `<div class="empty-state">No certifications published yet.</div>`);
}

function bindProjectInteractions() {
    document.querySelectorAll(".project-more-toggle").forEach((button) => {
        button.addEventListener("click", (event) => {
            const card = event.currentTarget.closest(".project-card");
            if (!card) {
                return;
            }
            const expanded = card.classList.toggle("is-expanded");
            button.setAttribute("aria-expanded", String(expanded));
        });
    });

    document.querySelectorAll(".project-card-close").forEach((button) => {
        button.addEventListener("click", (event) => {
            const card = event.currentTarget.closest(".project-card");
            if (!card) {
                return;
            }
            const toggle = card.querySelector(".project-more-toggle");
            card.classList.remove("is-expanded");
            toggle?.setAttribute("aria-expanded", "false");
        });
    });

    if (!state.projectEscapeBound) {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }
            document.querySelectorAll(".project-card.is-expanded").forEach((card) => {
                card.classList.remove("is-expanded");
                card.querySelector(".project-more-toggle")?.setAttribute("aria-expanded", "false");
            });
        });
        state.projectEscapeBound = true;
    }
}

async function loadProjects() {
    if (!element("project-search") || !element("project-category") || !element("project-status") || !element("project-featured")) {
        return;
    }

    const response = await projectsApi.getPublic({
        page: state.page,
        size: state.size,
        search: element("project-search").value.trim(),
        category: element("project-category").value,
        status: element("project-status").value,
        featured: element("project-featured").value
    });
    state.projectFeaturedFilter = element("project-featured").value;

    renderProjectCatalog(response.data);
}

function bindProjectControls() {
    if (!element("project-category") || !element("project-status")) {
        return;
    }

    element("project-category").innerHTML = optionMarkup(PROJECT_CATEGORIES, "All categories");
    element("project-status").innerHTML = optionMarkup(PROJECT_STATUSES, "All statuses");

    ["project-search", "project-category", "project-status", "project-featured"].forEach((id) => {
        const node = element(id);
        if (!node) {
            return;
        }
        node.addEventListener("input", async () => {
            state.page = 0;
            await loadProjects();
        });
        node.addEventListener("change", async () => {
            state.page = 0;
            await loadProjects();
        });
    });

    element("projects-prev")?.addEventListener("click", async () => {
        state.page = Math.max(0, state.page - 1);
        await loadProjects();
    });

    element("projects-next")?.addEventListener("click", async () => {
        state.page += 1;
        await loadProjects();
    });
}

function bindContactForm() {
    const form = element("contact-form");
    const status = element("contact-status");
    const submit = element("contact-submit");
    if (!form || !status || !submit) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(status, "Transmitting...");
        submit.disabled = true;
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            await contactApi.submit(payload);
            form.reset();
            setStatus(status, "Message delivered to the backend.", "success");
        } catch (error) {
            setStatus(status, error.message, "error");
        } finally {
            submit.disabled = false;
        }
    });
}

function bindSkillControls() {
    const searchInput = element("skill-search");
    const categorySelect = element("skill-category");

    if (!searchInput || !categorySelect) {
        return;
    }

    const uniqueCategories = [...new Set(state.skills.map((skill) => skill.category || "OTHER"))];
    const categoryOptions = uniqueCategories.map((category) => `<option value="${category}">${category.replaceAll("_", " ")}</option>`).join("");
    categorySelect.innerHTML = `<option value="">All Categories</option>${categoryOptions}`;

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;

        const filtered = state.skills.filter((skill) => {
            const matchesSearch = skill.skillName.toLowerCase().includes(query);
            const matchesCategory = category === "" || (skill.category || "OTHER") === category;
            return matchesSearch && matchesCategory;
        });

        renderSkills(filtered);
    }

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", applyFilters);
}

async function bootstrap() {
    initTheme();
    initNavigation();
    initAnimations();

    bindContactForm();
    bindProjectControls();
    bindSkillControls();

    const [dashboard, about, featured, skills, certifications, resume] = await Promise.allSettled([
        dashboardApi.getPublic(),
        aboutApi.getPublic(),
        projectsApi.featured(),
        skillsApi.list(),
        certificationsApi.list(),
        resumeApi.publicMetadata()
    ]);

    if (dashboard.status === "fulfilled") {
        state.dashboard = dashboard.value.data;
    }
    if (about.status === "fulfilled") {
        renderAbout(about.value.data);
    }
    renderAboutMetrics(state.dashboard);

    if (featured.status === "fulfilled") {
        renderFeaturedProjects(featured.value.data || []);
    } else {
        renderFeaturedProjects([]);
    }

    if (skills.status === "fulfilled") {
        state.skills = skills.value.data || [];
        renderSkills(state.skills);
    } else {
        state.skills = [];
        renderSkills([]);
    }

    renderKnowledge(
        resume.status === "fulfilled" ? resume.value.data : null,
        certifications.status === "fulfilled" ? (certifications.value.data || []) : []
    );

    renderMetrics([
        { label: "Featured Projects", value: state.dashboard?.totalFeaturedProjects ?? (featured.status === "fulfilled" ? featured.value.data?.length || 0 : 0) },
        { label: "Skill Nodes", value: state.dashboard?.totalSkills ?? (skills.status === "fulfilled" ? skills.value.data?.length || 0 : 0) },
        { label: "Credentials", value: state.dashboard?.totalCertifications ?? (certifications.status === "fulfilled" ? certifications.value.data?.length || 0 : 0) },
        { label: "Experience", value: `${about.status === "fulfilled" ? about.value.data?.experienceYears || 0 : 0}y` }
    ]);

    try {
        await loadProjects();
    } catch (error) {
        setHtml("project-catalog", `<div class="empty-state">${error.message}</div>`);
    }
}

bootstrap();
