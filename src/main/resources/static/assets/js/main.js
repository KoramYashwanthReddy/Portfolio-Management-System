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
    projectEscapeBound: false,
    starredProjects: JSON.parse(localStorage.getItem("starred_projects") || "[]"),
    comparedProjects: JSON.parse(localStorage.getItem("compared_projects") || "[]")
        .filter(Boolean)
        .map((id) => String(id))
        .slice(0, 3)
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

function mncProjectCard(project) {
    const technologies = splitTechnologies(project);
    const isCompleted = project.status === "COMPLETED";
    const statusColor = isCompleted ? "#10b981" : "#8b5cf6";
    const statusBg = isCompleted ? "rgba(16, 185, 129, 0.1)" : "rgba(139, 92, 246, 0.1)";
    const statusBorder = isCompleted ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)";
    const statusText = isCompleted ? "Completed" : "In development";
    const year = project.completionDate ? project.completionDate.substring(0, 4) : new Date().getFullYear();
    
    const isStarred = state.starredProjects.includes(String(project.id));
    const starClass = isStarred ? "fa-solid" : "fa-regular";
    const starTitle = isStarred ? "Unstar project" : "Star project";

    const isCompared = state.comparedProjects.includes(String(project.id));
    const compareClass = isCompared ? "fa-solid" : "fa-regular";

    return `
        <article class="mnc-card" data-category="${project.category || ''}" data-status="${project.status || ''}">
            <div class="mnc-card-header">
                <div class="mnc-card-header-left">
                    <span class="mnc-status-badge" style="background:${statusBg};color:${statusColor};border:1px solid ${statusBorder};">
                        <span class="mnc-status-dot" style="background:${statusColor};"></span>
                        ${statusText}
                    </span>
                    <span class="mnc-card-year">${year}</span>
                </div>
                <div class="mnc-card-header-right">
                    <button class="mnc-icon-btn mnc-compare-btn ${isCompared ? "selected" : ""}" type="button" data-id="${project.id}" title="Toggle compare" aria-label="Toggle compare" aria-pressed="${isCompared}">
                        <i class="${compareClass} fa-code-fork"></i>
                    </button>
                    <button class="mnc-icon-btn mnc-star-btn ${isStarred ? "starred" : ""}" type="button" data-id="${project.id}" title="${starTitle}" aria-label="${starTitle}" aria-pressed="${isStarred}">
                        <i class="${starClass} fa-star"></i>
                    </button>
                </div>
            </div>
            <div class="mnc-card-body">
                <h3 class="mnc-card-title">${project.title}</h3>
                <p class="mnc-card-desc">${project.shortDescription || ''}</p>
            </div>
            <div class="mnc-card-tags">
                ${technologies.map((tech) => `<span class="mnc-tech-tag">${tech}</span>`).join("")}
            </div>
            <div class="mnc-card-footer">
                ${project.githubUrl ? `<a class="mnc-link" href="${project.githubUrl}" target="_blank" rel="noreferrer"><i class="fa-brands fa-github"></i> GitHub</a>` : `<span class="mnc-link mnc-link-disabled"><i class="fa-brands fa-github"></i> GitHub</span>`}
                <button class="mnc-link project-more-toggle" type="button" aria-expanded="false" style="background:none;border:none;cursor:pointer;padding:0;font-family:inherit;"><i class="fa-solid fa-circle-info"></i> View More</button>
                <button class="mnc-arrow-link project-more-toggle" type="button" aria-expanded="false" title="View details"><i class="fa-solid fa-arrow-right"></i></button>
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
                    ${projectInsightRows(project).map((row) => `
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
    const uniqueProjects = uniqueById(projects);
    state.featuredProjects = uniqueProjects;
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
    state.projects = uniqueProjects;
    renderAllProjectsMnc();
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

function renderKnowledge(resume, certifications, resumeError = "") {
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
    } else if (resumeError) {
        actionsContainer.innerHTML = `<button class="button button-primary" disabled style="border-radius: 99px; opacity: 0.5;">Resume unavailable</button>`;
        previewWrapper.innerHTML = `
            <div class="empty-state" style="display:grid; gap:10px;">
                <strong>Resume could not be loaded.</strong>
                <span>${resumeError}</span>
            </div>
        `;
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

function renderAllProjectsMnc() {
    updateMncProjectsDisplay(false);
}

function updateMncProjectsDisplay(showShimmer = true) {
    const grid = element("projects-mnc-grid");
    if (!grid) return;

    const searchInput = element("projects-search-input");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    const activePill = document.querySelector(".filter-pill.active");
    const filter = activePill ? activePill.dataset.filter : "all";

    const allProjects = uniqueById([...(state.featuredProjects || []), ...(state.projects || [])]);

    const filtered = allProjects.filter((project) => {
        const status = project.status || "";
        const category = project.category || "";
        
        let matchesPill = false;
        if (filter === "all") {
            matchesPill = true;
        } else if (filter === "COMPLETED") {
            matchesPill = status === "COMPLETED";
        } else if (filter === "IN_PROGRESS") {
            matchesPill = (status === "IN_PROGRESS" || status === "PLANNED");
        } else if (filter === "BLOCKCHAIN") {
            const titleText = (project.title || "").toLowerCase();
            const descText = (project.shortDescription || "").toLowerCase();
            const tagsText = (project.technologies || "").toLowerCase();
            matchesPill = category === "BLOCKCHAIN" || titleText.includes("blockchain") || descText.includes("blockchain") || tagsText.includes("solidity");
        } else {
            matchesPill = category === filter;
        }

        if (!matchesPill) return false;

        if (!query) return true;
        const titleText = (project.title || "").toLowerCase();
        const descText = (project.shortDescription || "").toLowerCase();
        const tagsText = (project.technologies || "").toLowerCase();
        return titleText.includes(query) || descText.includes(query) || tagsText.includes(query);
    });

    if (showShimmer) {
        grid.innerHTML = Array(3).fill(0).map(() => `
            <div class="shimmer-card">
                <div class="shimmer-line header-left" style="height: 24px; width: 120px; border-radius: 12px; background: var(--border);"></div>
                <div class="shimmer-line title" style="height: 20px; width: 70%; margin-top: 8px; background: var(--border);"></div>
                <div class="shimmer-line desc-1" style="width: 90%; background: var(--border);"></div>
                <div class="shimmer-line desc-2" style="width: 80%; background: var(--border);"></div>
                <div class="shimmer-line tags" style="height: 24px; width: 50%; border-radius: 6px; margin-top: 12px; background: var(--border);"></div>
            </div>
        `).join("");

        setTimeout(() => {
            renderFilteredList(grid, filtered);
        }, 350);
    } else {
        renderFilteredList(grid, filtered);
    }
}

function renderFilteredList(grid, filtered) {
    grid.innerHTML = filtered.map((project) => mncProjectCard(project)).join("") || `<div class="empty-state">No matching projects found.</div>`;
    bindProjectInteractions();
    bindCardFeatureEvents();
}

function bindFilterPills() {
    const container = element("project-filter-pills");
    if (!container) return;
    container.querySelectorAll(".filter-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
            container.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
            pill.classList.add("active");
            updateMncProjectsDisplay(true);
        });
    });
}

function bindProjectInteractions() {
    document.querySelectorAll(".project-more-toggle").forEach((button) => {
        button.addEventListener("click", (event) => {
            const card = event.currentTarget.closest(".mnc-card");
            if (!card) return;
            const expanded = card.classList.toggle("is-expanded");
            button.setAttribute("aria-expanded", String(expanded));
        });
    });

    document.querySelectorAll(".project-card-close").forEach((button) => {
        button.addEventListener("click", (event) => {
            const card = event.currentTarget.closest(".mnc-card");
            if (!card) return;
            card.classList.remove("is-expanded");
            card.querySelectorAll(".project-more-toggle").forEach(toggle => {
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    });

    if (!state.projectEscapeBound) {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            document.querySelectorAll(".mnc-card.is-expanded").forEach((card) => {
                card.classList.remove("is-expanded");
                card.querySelectorAll(".project-more-toggle").forEach(toggle => {
                    toggle.setAttribute("aria-expanded", "false");
                });
            });
        });
        state.projectEscapeBound = true;
    }
}

function bindCardFeatureEvents() {
    document.querySelectorAll(".mnc-star-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const projectId = String(e.currentTarget.dataset.id);
            let starred = JSON.parse(localStorage.getItem("starred_projects") || "[]");
            if (starred.includes(projectId)) {
                starred = starred.filter(id => id !== projectId);
                e.currentTarget.classList.remove("starred");
                e.currentTarget.querySelector("i")?.classList.remove("fa-solid");
                e.currentTarget.querySelector("i")?.classList.add("fa-regular");
                e.currentTarget.title = "Star project";
                e.currentTarget.setAttribute("aria-label", "Star project");
                e.currentTarget.setAttribute("aria-pressed", "false");
            } else {
                starred.push(projectId);
                e.currentTarget.classList.add("starred");
                e.currentTarget.querySelector("i")?.classList.remove("fa-regular");
                e.currentTarget.querySelector("i")?.classList.add("fa-solid");
                e.currentTarget.title = "Unstar project";
                e.currentTarget.setAttribute("aria-label", "Unstar project");
                e.currentTarget.setAttribute("aria-pressed", "true");
            }
            localStorage.setItem("starred_projects", JSON.stringify(starred));
            state.starredProjects = starred;
        });
    });

    document.querySelectorAll(".mnc-compare-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const projectId = String(e.currentTarget.dataset.id);
            const idx = state.comparedProjects.indexOf(projectId);
            if (idx > -1) {
                state.comparedProjects.splice(idx, 1);
                e.currentTarget.classList.remove("selected");
                e.currentTarget.querySelector("i")?.classList.remove("fa-solid");
                e.currentTarget.querySelector("i")?.classList.add("fa-regular");
                e.currentTarget.setAttribute("aria-pressed", "false");
            } else {
                if (state.comparedProjects.length >= 3) {
                    alert("You can compare up to 3 projects at once.");
                    return;
                }
                state.comparedProjects.push(projectId);
                e.currentTarget.classList.add("selected");
                e.currentTarget.querySelector("i")?.classList.remove("fa-regular");
                e.currentTarget.querySelector("i")?.classList.add("fa-solid");
                e.currentTarget.setAttribute("aria-pressed", "true");
            }
            localStorage.setItem("compared_projects", JSON.stringify(state.comparedProjects));
            updateCompareBanner();
        });
    });
}

function updateCompareBanner() {
    const banner = element("project-compare-banner");
    const countSpan = element("compare-count");
    if (!banner || !countSpan) return;

    const count = state.comparedProjects.length;
    countSpan.textContent = count;

    if (count > 0) {
        banner.classList.remove("hidden");
    } else {
        banner.classList.add("hidden");
    }
}

function showComparisonModal() {
    const modal = element("project-compare-modal");
    const table = element("compare-table");
    if (!modal || !table) return;

    const allProjects = uniqueById([...(state.featuredProjects || []), ...(state.projects || [])]);
    const selected = allProjects.filter(p => state.comparedProjects.includes(String(p.id)));

    if (selected.length === 0) return;

    let html = `
        <thead>
            <tr>
                <th style="border-top-left-radius: 12px;">Feature</th>
                ${selected.map((p, i) => `<th style="${i === selected.length - 1 ? 'border-top-right-radius: 12px;' : ''}">${p.title}</th>`).join("")}
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Status</strong></td>
                ${selected.map(p => `<td>${p.status === 'COMPLETED' ? 'Completed' : 'In development'}</td>`).join("")}
            </tr>
            <tr>
                <td><strong>Category</strong></td>
                ${selected.map(p => `<td>${enumLabel(p.category)}</td>`).join("")}
            </tr>
            <tr>
                <td><strong>Grade</strong></td>
                ${selected.map(p => `<td><strong>${projectGrade(p)}</strong></td>`).join("")}
            </tr>
            <tr>
                <td><strong>Tech Stack</strong></td>
                ${selected.map(p => `<td>${splitTechnologies(p).map(t => `<span class="mnc-tech-tag" style="margin-right:4px; margin-bottom:4px; display:inline-block;">${t}</span>`).join("")}</td>`).join("")}
            </tr>
            <tr>
                <td><strong>Description</strong></td>
                ${selected.map(p => `<td>${p.shortDescription || "No description available."}</td>`).join("")}
            </tr>
            <tr>
                <td><strong>Detailed Insights</strong></td>
                ${selected.map(p => `<td>${p.detailedDescription || "No details provided."}</td>`).join("")}
            </tr>
            <tr>
                <td style="border-bottom-left-radius: 12px;"><strong>Repository</strong></td>
                ${selected.map((p, i) => `<td style="${i === selected.length - 1 ? 'border-bottom-right-radius: 12px;' : ''}">${p.githubUrl ? `<a class="mnc-link" href="${p.githubUrl}" target="_blank"><i class="fa-brands fa-github"></i> Repository</a>` : "Not available"}</td>`).join("")}
            </tr>
        </tbody>
    `;

    table.innerHTML = html;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function bindCompareControls() {
    const bannerClear = element("compare-clear-btn");
    const bannerTrigger = element("compare-trigger-btn");
    const modalClose = element("compare-close-btn");
    const modal = element("project-compare-modal");

    if (bannerClear) {
        bannerClear.addEventListener("click", () => {
            state.comparedProjects = [];
            localStorage.setItem("compared_projects", JSON.stringify(state.comparedProjects));
            updateCompareBanner();
            document.querySelectorAll(".mnc-compare-btn").forEach(btn => {
                btn.classList.remove("selected");
                btn.querySelector("i")?.classList.remove("fa-solid");
                btn.querySelector("i")?.classList.add("fa-regular");
                btn.setAttribute("aria-pressed", "false");
            });
        });
    }

    if (bannerTrigger) {
        bannerTrigger.addEventListener("click", showComparisonModal);
    }

    if (modalClose && modal) {
        modalClose.addEventListener("click", () => {
            modal.classList.add("hidden");
            document.body.style.overflow = "";
        });
    }
}

async function loadProjects() {
    const response = await projectsApi.getPublic({
        page: state.page,
        size: 50,
        search: "",
        category: "",
        status: "",
        featured: ""
    });
    renderProjectCatalog(response.data);
}

function bindProjectControls() {
    const searchInput = element("projects-search-input");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateMncProjectsDisplay(true);
            }, 300);
        });
    }
    bindCompareControls();
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
    updateCompareBanner();

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

    const resumeError = resume.status === "rejected" && resume.reason?.status !== 404
        ? (resume.reason?.message || "Resume metadata is unavailable.")
        : "";

    renderKnowledge(
        resume.status === "fulfilled" ? resume.value.data : null,
        certifications.status === "fulfilled" ? (certifications.value.data || []) : [],
        resumeError
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

    updateCompareBanner();
}

bootstrap();
