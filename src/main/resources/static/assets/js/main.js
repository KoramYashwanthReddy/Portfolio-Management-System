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

function readStoredArray(key) {
    try {
        const value = localStorage.getItem(key);
        if (!value) {
            return [];
        }
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStoredArray(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage failures so the public site still boots.
    }
}

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
    heroBiographyEscapeBound: false,
    heroBiographyPopupBound: false,
    projectDetail: null,
    starredProjects: readStoredArray("starred_projects"),
    comparedProjects: readStoredArray("compared_projects")
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

function setSrc(id, value, fallback = "") {
    const node = element(id);
    if (node) {
        node.src = value || fallback;
    }
}

function syncHeroBiographyPopup(rawBiography) {
    const biography = element("hero-biography");
    const popup = element("hero-biography-popup");
    const popupText = element("hero-biography-full");
    const moreButton = element("hero-biography-more");

    if (!biography || !popup || !popupText || !moreButton) {
        return;
    }

    const text = String(rawBiography || biography.textContent || "").trim() || "No biography available.";
    setText("hero-biography", text);
    setText("hero-biography-full", text);

    popup.classList.remove("is-visible");
    popup.setAttribute("aria-hidden", "true");
    moreButton.hidden = true;
    moreButton.setAttribute("aria-expanded", "false");

    requestAnimationFrame(() => {
        const isOverflowing = biography.scrollHeight > biography.clientHeight + 1;
        moreButton.hidden = !isOverflowing;
    });
}

function bindHeroBiographyPopup() {
    if (state.heroBiographyPopupBound) {
        return;
    }

    const moreButton = element("hero-biography-more");
    const popup = element("hero-biography-popup");
    const closeButton = element("hero-biography-close");

    if (!moreButton || !popup || !closeButton) {
        return;
    }

    if (popup.parentElement !== document.body) {
        document.body.appendChild(popup);
    }

    const setOpen = (isOpen) => {
        popup.classList.toggle("is-visible", isOpen);
        popup.setAttribute("aria-hidden", String(!isOpen));
        moreButton.setAttribute("aria-expanded", String(isOpen));
        document.body.style.overflow = isOpen ? "hidden" : "";
        if (isOpen) {
            closeButton.focus({ preventScroll: true });
        }
    };

    moreButton.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(!popup.classList.contains("is-visible"));
    });

    closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(false);
    });

    popup.addEventListener("click", (event) => {
        if (event.target === popup) {
            setOpen(false);
        }
    });

    window.addEventListener("resize", () => {
        if (state.about?.biography) {
            syncHeroBiographyPopup(state.about.biography);
        }
    });

    if (!state.heroBiographyEscapeBound) {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        });
        state.heroBiographyEscapeBound = true;
    }

    state.heroBiographyPopupBound = true;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function buildTickerItems(rawTicker) {
    const fallback = ["System Architecture", "Backend Design", "Spring Boot", "JWT Security", "Microservices"];
    const items = String(rawTicker || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const sequence = items.length ? items : fallback;
    return [...sequence, ...sequence];
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

function isDisplayedRecord(record) {
    return record?.displayed !== false;
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

function projectStatusMeta(project) {
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
    syncHeroBiographyPopup(about?.biography || "No biography available.");
    setText("overview-copy", about?.biography || "Awaiting about information.");
    setText("experience-years", `${about?.experienceYears || 0} years`);
    setText("hero-location", about?.currentLocation || "Unavailable");
    setText("hero-email", about?.email || "Unavailable");
    setText("hero-location-pill", about?.currentLocation || "Unavailable");
    setText("welcome-experience-years", `${about?.experienceYears || 0}+`);
    setText("welcome-email", about?.email || "Unavailable");
    setText("welcome-location", about?.currentLocation || "Unavailable");
    setText("hero-profile-name", about?.name || "Loading...");
    setText("hero-profile-title", about?.designation || "Loading...");
    setText("hero-profile-title-inline", about?.designation || "Loading...");
    setSrc("hero-profile-img", about?.profileImageUrl, "/api/v1/assets/images/profile-placeholder.jpg");
    setSrc("about-profile-img", about?.profileImageUrl, "/api/v1/assets/images/profile-placeholder.jpg");
    setSrc("feedback-profile-img", about?.profileImageUrl, "/api/v1/assets/images/profile-placeholder.jpg");
    setHref("linkedin-link", about?.linkedinUrl);
    setText("linkedin-link", about?.linkedinUrl || "Unavailable");
    setHref("github-link", about?.githubUrl);
    setText("github-link", about?.githubUrl || "Unavailable");
    setHref("portfolio-link", about?.portfolioUrl);
    setText("portfolio-link", about?.portfolioUrl || "Unavailable");
    setText("hero-full-name", about?.name || "Koram Yashwanth Reddy");
    setText("feedback-full-name", about?.name || "Koram Yashwanth Reddy");
    setText("feedback-designation", about?.designation || "Backend Engineer");
    setText("feedback-location", about?.currentLocation || "Unavailable");
    setText("feedback-email", about?.email || "Unavailable");
    setText("feedback-bio", about?.biography || "Production-grade Java + Spring Boot engineer.");

    const initTypewriter = (elId, rawTicker) => {
        const typewriterTextEl = element(elId);
        if (!typewriterTextEl) return;
        
        const items = String(rawTicker || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        const words = items.length ? items : ["System Architecture", "Backend Design", "Spring Boot", "JWT Security", "Microservices"];
        
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let delay = 100;

        function type() {
            const currentWord = words[wordIndex];
            if (isDeleting) {
                typewriterTextEl.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
                delay = 40; // Deleting speed
            } else {
                typewriterTextEl.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
                delay = 100; // Typing speed
            }

            if (!isDeleting && charIndex === currentWord.length) {
                delay = 2000; // Pause at the end of the word
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                delay = 500; // Pause before typing next word
            }

            setTimeout(type, delay);
        }
        type();
    };

    initTypewriter("hero-typewriter-text", about?.headlineTicker);
    initTypewriter("feedback-typewriter-text", about?.headlineTicker);

    const heroHeader = element("hero-name-header");
    if (heroHeader && !element("hero-full-name") && about?.name) {
        heroHeader.innerHTML = `Hi, I'm <span class="highlight-violet">${escapeHtml(about.name)}</span>.`;
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

function formatSkillCategory(category = "OTHER") {
    return String(category || "OTHER")
        .replace(/_/g, " ")
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

function getSkillCardPalette(category = "OTHER") {
    const normalized = String(category || "OTHER").toUpperCase();
    const palettes = {
        LANGUAGE: { accent: "#4f46e5", soft: "rgba(79, 70, 229, 0.14)" },
        FRAMEWORK: { accent: "#7c3aed", soft: "rgba(124, 58, 237, 0.14)" },
        DATABASE: { accent: "#0f766e", soft: "rgba(15, 118, 110, 0.14)" },
        CLOUD: { accent: "#0284c7", soft: "rgba(2, 132, 199, 0.14)" },
        DEVOPS: { accent: "#059669", soft: "rgba(5, 150, 105, 0.14)" },
        TOOL: { accent: "#d97706", soft: "rgba(217, 119, 6, 0.14)" },
        SOFT_SKILL: { accent: "#db2777", soft: "rgba(219, 39, 119, 0.14)" },
        OTHER: { accent: "#64748b", soft: "rgba(100, 116, 139, 0.14)" }
    };

    return palettes[normalized] || palettes.OTHER;
}

function renderSkills(skills) {
    const visibleSkills = (skills || []).filter(isDisplayedRecord);
    const byCategory = visibleSkills.reduce((accumulator, skill) => {
        const key = skill.category || "OTHER";
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(skill);
        return accumulator;
    }, {});

    const categories = Object.entries(byCategory);
    const hasSingleCategory = categories.length === 1;

    const content = hasSingleCategory
        ? categories.flatMap(([category, items]) => {
            const palette = getSkillCardPalette(category);
            return items
                .slice()
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((skill) => `
                    <article class="masonry-skill-card masonry-skill-card--compact" data-reveal style="--skill-accent:${palette.accent}; --skill-accent-soft:${palette.soft};">
                        <div class="skill-card-header skill-card-header--compact">
                            <h3>${escapeHtml(skill.skillName)}</h3>
                            <span class="skill-count">${skill.proficiencyPercentage}%</span>
                        </div>
                        <div class="masonry-skill-header">
                            <span class="masonry-skill-name">${formatSkillCategory(category)}</span>
                            <span class="masonry-skill-percent">${skill.proficiencyPercentage}%</span>
                        </div>
                        <div class="masonry-progress-track">
                            <div class="masonry-progress-fill" style="width: ${skill.proficiencyPercentage}%;"></div>
                        </div>
                    </article>
                `);
        })
        : categories.map(([category, items]) => {
            const palette = getSkillCardPalette(category);
            return `
            <article class="masonry-skill-card" data-reveal style="--skill-accent:${palette.accent}; --skill-accent-soft:${palette.soft};">
                <div class="skill-card-header">
                    <h3>${formatSkillCategory(category)}</h3>
                    <span class="skill-count">${items.length} skills</span>
                </div>
                <div class="skill-list-container">
                    ${items.sort((a, b) => a.displayOrder - b.displayOrder).map((skill) => `
                        <div class="masonry-skill-item">
                            <div class="masonry-skill-header">
                                <span class="masonry-skill-name">
                                    ${skill.skillName}
                                </span>
                                <span class="masonry-skill-percent">${skill.proficiencyPercentage}%</span>
                            </div>
                            <div class="masonry-progress-track">
                                <div class="masonry-progress-fill" style="width: ${skill.proficiencyPercentage}%;"></div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </article>
        `;
        });

    setHtml("skill-clusters", content.join("") || `<div class="empty-state">No skills published yet.</div>`);
}

function mncProjectCard(project, index = 0) {
    const technologies = splitTechnologies(project);
    const status = projectStatusMeta(project);
    const year = project.completionDate ? project.completionDate.substring(0, 4) : new Date().getFullYear();
    const isStarred = state.starredProjects.includes(String(project.id));
    const starClass = isStarred ? "fa-solid" : "fa-regular";
    const starTitle = isStarred ? "Unstar project" : "Star project";
    const isCompared = state.comparedProjects.includes(String(project.id));
    const compareClass = isCompared ? "fa-solid" : "fa-regular";

    return `
        <article class="mnc-card project-card-shell" data-category="${project.category || ''}" data-status="${project.status || ''}">
            <div class="project-card-header-top">
                <div class="project-card-top-pills">
                    <span class="project-number">${String(index + 1).padStart(2, "0")}</span>
                    <span class="project-status-pill" style="background:${status.background};color:${status.color};border:1px solid ${status.border};">
                        <span class="mnc-status-dot" style="background:${status.dot};"></span>
                        ${status.label}
                    </span>
                    <span class="project-year">${year}</span>
                </div>
                <div class="project-card-top-actions">
                    <button class="mnc-icon-btn mnc-compare-btn ${isCompared ? "selected" : ""}" type="button" data-id="${project.id}" title="Toggle compare" aria-label="Toggle compare" aria-pressed="${isCompared}">
                        <i class="${compareClass} fa-code-fork"></i>
                    </button>
                    <button class="mnc-icon-btn mnc-star-btn ${isStarred ? "starred" : ""}" type="button" data-id="${project.id}" title="${starTitle}" aria-label="${starTitle}" aria-pressed="${isStarred}">
                        <i class="${starClass} fa-star"></i>
                    </button>
                </div>
            </div>
            <div class="project-card-title-block" style="position: relative;">
                <h3 class="mnc-card-title">${escapeHtml(project.title || "Untitled project")}</h3>
                <p class="section-copy" style="font-size: 0.85rem; line-height: 1.5; margin: 8px 0 0;">
                    ${escapeHtml(project.shortDescription && project.shortDescription.length > 90 ? project.shortDescription.substring(0, 85) + "..." : (project.shortDescription || "No description."))}
                    ${project.shortDescription && project.shortDescription.length > 90 ? `<button class="desc-more-btn" type="button" style="background:none; border:none; color:var(--accent); font-weight:700; cursor:pointer; padding:0; font-size:0.8rem; margin-left:4px; text-decoration:underline;">more</button>` : ""}
                </p>
                ${project.shortDescription && project.shortDescription.length > 90 ? `
                <div class="description-popup-overlay">
                    <div class="description-popup-content">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="eyebrow" style="color:var(--accent); margin:0;">PROJECT DETAILS</span>
                            <button class="close-popup-btn" type="button" style="background:none; border:none; color:var(--muted); font-size:1.2rem; cursor:pointer; padding:0 4px;">&times;</button>
                        </div>
                        <h4 style="margin: 4px 0 8px; font-size:1.05rem; color:var(--foreground);">${escapeHtml(project.title)}</h4>
                        <p style="font-size:0.85rem; line-height:1.6; color:var(--muted); margin:0; overflow-y:auto; max-height:140px;">${escapeHtml(project.shortDescription)}</p>
                    </div>
                </div>
                ` : ""}
            </div>
            <div class="project-stack-block">
                <div class="project-stack-header">
                    <span class="project-stack-label">Stacks</span>
                    <span class="project-stack-hint">${technologies.length} ${technologies.length === 1 ? "technology" : "technologies"}</span>
                </div>
                <div class="project-card-tech-list">
                    ${technologies.slice(0, 5).map((tech) => `<span class="mnc-tech-tag">${escapeHtml(tech)}</span>`).join("")}
                    ${technologies.length > 5 ? `<span class="mnc-tech-tag mnc-tech-overflow" title="${escapeHtml(technologies.slice(5).join(", "))}">+${technologies.length - 5} more</span>` : ""}
                </div>
            </div>
            <div class="project-card-footer">
                <div class="project-footer-links">
                    ${project.githubUrl ? `<a class="project-footer-link" href="${project.githubUrl}" target="_blank" rel="noreferrer"><i class="fa-brands fa-github"></i> GitHub</a>` : `<span class="project-footer-link is-disabled"><i class="fa-brands fa-github"></i> GitHub</span>`}
                    <button class="project-footer-link project-more-toggle" type="button" data-project-detail="${project.id}" aria-expanded="false">
                        <i class="fa-solid fa-circle-info"></i>
                        <span>View More</span>
                    </button>
                </div>
                <button class="project-footer-arrow project-more-toggle" type="button" data-project-detail="${project.id}" aria-expanded="false" title="View details" aria-label="View details">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </article>
    `;
}

function buildProjectDetailMarkup(project) {
    const technologies = splitTechnologies(project);
    const imageUrl = project?.imageFile?.downloadUrl || project?.imageUrl || "";
    const videoUrl = project?.videoFile?.downloadUrl || project?.videoUrl || "";
    const imageFallback = "/api/v1/assets/images/profile-placeholder.jpg";
    const highlights = projectHighlights(project);
    const mediaPreviews = [
        imageUrl ? `
        <div class="project-detail-gallery">
            <span class="project-detail-section-label">Preview</span>
            <div class="project-detail-gallery-frame has-image">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(project.title)} preview image" onerror="this.onerror=null;this.src='${imageFallback}';">
            </div>
        </div>
        ` : "",
        videoUrl ? `
        <div class="project-detail-gallery">
            <span class="project-detail-section-label">Video Preview</span>
            <div class="project-detail-gallery-frame has-image" style="background:#000;">
                <video src="${escapeHtml(videoUrl)}" controls preload="metadata" aria-label="${escapeHtml(project.title)} video preview" style="width:100%;height:100%;min-height:240px;object-fit:cover;display:block;background:#000;"></video>
            </div>
        </div>
        ` : ""
    ].filter(Boolean).join("");
    const paragraphs = [project.shortDescription, project.detailedDescription]
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean);
    return `
        <div class="project-detail-shell">
            <div class="project-detail-hero">
                <div class="project-detail-hero-main">
                    <div class="project-detail-media project-detail-media--hero ${imageUrl ? "has-image" : ""}">
                        ${imageUrl
                            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(project.title)} preview" onerror="this.onerror=null;this.src='${imageFallback}';">`
                            : `<img src="${imageFallback}" alt="${escapeHtml(project.title)} preview">`}
                    </div>
                    <div class="project-detail-hero-copy">
                        <p class="eyebrow" style="color: var(--accent-alt); margin-bottom: 2px;">PROJECT DETAILS</p>
                        <h2 style="margin: 0;">${escapeHtml(project.title || "Untitled project")}</h2>
                        <p class="project-detail-subtitle">${escapeHtml(project.shortDescription || "No short description available.")}</p>
                    </div>
                </div>
                <div class="project-detail-hero-aside">
                    <span class="chip">${project.featured ? "Featured" : "Selected work"}</span>
                    <span class="chip">${project.status || "Unknown status"}</span>
                    <span class="chip">${project.category || "Uncategorized"}</span>
                </div>
            </div>
            <div class="project-detail-grid">
                ${projectInsightRows(project).map((row) => `
                    <article class="project-detail-card">
                        <span>${row.label}</span>
                        <strong>${row.value}</strong>
                    </article>
                `).join("")}
            </div>
            <div class="project-detail-body">
                <div class="project-detail-copy">
                    ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </div>
                ${highlights.length ? `
                <div class="project-detail-highlights">
                    <span class="project-detail-section-label">Highlights</span>
                    <ul class="project-detail-highlight-list">
                        ${highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join("")}
                    </ul>
                </div>
                ` : ""}
                ${mediaPreviews ? `<div class="project-detail-media-grid">${mediaPreviews}</div>` : ""}
                <div class="mnc-card-tags">
                    ${technologies.map((tech) => `<span class="mnc-tech-tag">${escapeHtml(tech)}</span>`).join("")}
                </div>
            </div>
            <div class="project-detail-actions">
                ${project.githubUrl ? `<a class="button button-outline" href="${project.githubUrl}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
                ${project.liveUrl ? `<a class="button button-outline" href="${project.liveUrl}" target="_blank" rel="noreferrer">Live</a>` : ""}
            </div>
        </div>
    `;
}


function renderFeaturedProjects(projects) {
    const uniqueProjects = uniqueById((projects || []).filter(isDisplayedRecord));
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
    const uniqueProjects = uniqueById((pageData.content || []).filter(isDisplayedRecord));
    state.projects = uniqueProjects;
    renderAllProjectsMnc();
}

function buildHtmlResume(certifications, resume) {
    const about = state.about || {};
    const featuredProjects = uniqueById([
        ...state.featuredProjects.filter(isDisplayedRecord),
        ...state.projects.filter((project) => project.featured && isDisplayedRecord(project))
    ]).slice(0, 3);

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

    const certList = (certifications || []).filter(isDisplayedRecord).map((certification) => `
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
            <div class="resume-preview-card open-resume-modal">
                <div class="preview-eyebrow">Resume uploaded</div>
                <div class="preview-name">${state.about?.name || "Koram Yashwanth Reddy"}</div>
                <div class="preview-title">${state.about?.designation || "Entry-Level Software Developer"}</div>
                <div class="resume-preview-meta">
                    <span class="chip">${resume.versionLabel || "Latest"}</span>
                    <span class="chip">Uploaded ${formatDate(resume.uploadedAt)}</span>
                    <span class="chip">${resume.file?.contentType || "Document"}</span>
                </div>
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

    setHtml("certification-grid", certifications.map((certification, index) => {
        const num = String(index + 1).padStart(2, "0");
        const issueYear = certification.issueDate ? certification.issueDate.substring(0, 4) : "";
        const dateLabel = certification.issueDate
            ? `Issued ${certification.issueDate}${certification.expiryDate ? ` · Expires ${certification.expiryDate}` : ""}`
            : "Date unavailable";
        return `
        <article class="cert-card" data-reveal>
            <div class="cert-card-header">
                <div class="cert-card-header-left">
                    <span class="cert-card-num">${num}</span>
                    <span class="cert-issuer-badge">${escapeHtml(certification.issuer || "Unknown issuer")}</span>
                    ${issueYear ? `<span class="cert-card-year">${issueYear}</span>` : ""}
                </div>
                <div class="cert-card-header-right">
                    <i class="fa-solid fa-certificate cert-card-icon" aria-hidden="true"></i>
                </div>
            </div>
            <div class="cert-card-body">
                <h3 class="cert-card-title">${escapeHtml(certification.title || "Untitled")}</h3>
                <p class="cert-card-date">${escapeHtml(dateLabel)}</p>
            </div>
            ${certification.credentialId ? `
            <div class="cert-card-tags">
                <span class="mnc-tech-tag"><i class="fa-solid fa-fingerprint" style="font-size:0.65rem;"></i> ${escapeHtml(certification.credentialId)}</span>
            </div>` : ""}
            <div class="cert-card-footer">
                <div class="cert-footer-links">
                    ${certification.credentialUrl
                        ? `<a class="cert-footer-link" href="${certification.credentialUrl}" target="_blank" rel="noreferrer"><i class="fa-solid fa-shield-halved"></i> Verify</a>`
                        : `<span class="cert-footer-link is-disabled"><i class="fa-solid fa-shield-halved"></i> Verify</span>`}
                    ${certification.certificateFile?.downloadUrl
                        ? `<a class="cert-footer-link" href="${certification.certificateFile.downloadUrl}" target="_blank" rel="noreferrer"><i class="fa-regular fa-file-pdf"></i> Open PDF</a>`
                        : ""}
                </div>
                <span class="cert-footer-arrow"><i class="fa-solid fa-award"></i></span>
            </div>
        </article>
        `;
    }).join("") || `<div class="empty-state">No certifications published yet.</div>`);
}

function renderAllProjectsMnc() {
    updateMncProjectsDisplay(false);
}

function updateMncProjectsDisplay(showShimmer = true) {
    const grid = element("projects-mnc-grid");
    if (!grid) return;

    const searchInput = element("projects-search-input");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    const activePill = document.querySelector("#project-filter-pills .filter-pill.active");
    const filter = activePill ? activePill.dataset.filter : "all";

    const allProjects = uniqueById([...(state.featuredProjects || []), ...(state.projects || [])].filter(isDisplayedRecord));

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
    grid.innerHTML = filtered.map((project, index) => mncProjectCard(project, index + 1)).join("") || `<div class="empty-state">No matching projects found.</div>`;
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
    const detailModal = element("project-detail-modal");
    const detailContent = element("project-detail-content");
    const detailClose = element("project-detail-close");

    document.querySelectorAll("[data-project-detail]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const projectId = String(event.currentTarget.dataset.projectDetail);
            const allProjects = uniqueById([...(state.featuredProjects || []), ...(state.projects || [])]);
            const project = allProjects.find((item) => String(item.id) === projectId);
            if (!project || !detailModal || !detailContent) {
                return;
            }
            state.projectDetail = project;
            detailContent.innerHTML = buildProjectDetailMarkup(project);
            detailModal.classList.remove("hidden");
            document.body.style.overflow = "hidden";
            document.querySelectorAll(".project-more-toggle").forEach((toggle) => {
                toggle.setAttribute("aria-expanded", String(toggle.dataset.projectDetail === projectId));
            });
        });
    });

    function closeDetailModal() {
        if (!detailModal) {
            return;
        }
        detailModal.classList.add("hidden");
        document.body.style.overflow = "";
        state.projectDetail = null;
        document.querySelectorAll(".project-more-toggle").forEach((toggle) => {
            toggle.setAttribute("aria-expanded", "false");
        });
    }

    detailClose?.addEventListener("click", closeDetailModal);
    detailModal?.addEventListener("click", (event) => {
        if (event.target === detailModal) {
            closeDetailModal();
        }
    });

    // Description overlays bindings
    document.querySelectorAll(".desc-more-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const card = btn.closest(".project-card-shell");
            const overlay = card?.querySelector(".description-popup-overlay");
            if (overlay) overlay.classList.add("is-visible");
        });
    });

    document.querySelectorAll(".close-popup-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const overlay = btn.closest(".description-popup-overlay");
            if (overlay) overlay.classList.remove("is-visible");
        });
    });

    if (!state.projectEscapeBound) {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (!detailModal?.classList.contains("hidden")) {
                closeDetailModal();
            }
            document.querySelectorAll(".description-popup-overlay.is-visible").forEach((overlay) => {
                overlay.classList.remove("is-visible");
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
            let starred = readStoredArray("starred_projects");
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
            writeStoredArray("starred_projects", starred);
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
            writeStoredArray("compared_projects", state.comparedProjects);
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
            writeStoredArray("compared_projects", state.comparedProjects);
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
    bindFilterPills();

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

function bindContactForms() {
    const forms = [
        { form: element("contact-form"), status: element("contact-status"), submit: element("contact-submit") },
        { form: element("feedback-form"), status: element("feedback-status"), submit: element("feedback-submit") }
    ].filter(({ form, status, submit }) => form && status && submit);

    forms.forEach(({ form, status, submit }) => {
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
    });
}

function normalizeSkillCategoryValue(category = "OTHER") {
    return String(category || "OTHER").trim().replace(/\s+/g, "_").toUpperCase();
}

function syncSkillFilterOptions() {
    const categorySelect = element("skill-category");
    const pillButtons = Array.from(document.querySelectorAll("[data-skill-pill]"));

    if (!categorySelect) {
        return;
    }

    const uniqueCategories = [...new Set(state.skills.map((skill) => normalizeSkillCategoryValue(skill.category)))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    const categoryOptions = uniqueCategories
        .map((category) => `<option value="${category}">${formatSkillCategory(category)}</option>`)
        .join("");

    categorySelect.innerHTML = `<option value="">All Categories</option>${categoryOptions}`;

    const activeSelection = categorySelect.value || "";
    if (activeSelection && !uniqueCategories.includes(activeSelection)) {
        categorySelect.value = "";
    }

    pillButtons.forEach((button) => {
        const value = button.getAttribute("data-skill-pill") || "";
        button.classList.toggle("is-active", value === (categorySelect.value || ""));
    });
}

function bindSkillControls() {
    const searchInput = element("skill-search");
    const categorySelect = element("skill-category");
    const pillButtons = Array.from(document.querySelectorAll("[data-skill-pill]"));

    if (!searchInput || !categorySelect) {
        return;
    }

    function setActivePill(categoryValue = "") {
        pillButtons.forEach((button) => {
            const value = button.getAttribute("data-skill-pill") || "";
            button.classList.toggle("is-active", value === categoryValue);
        });
    }

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value || "";

        const filtered = state.skills.filter((skill) => {
            const normalizedSkill = normalizeSkillCategoryValue(skill.category);
            const matchesSearch = String(skill.skillName || "").toLowerCase().includes(query);
            const matchesCategory = category === "" || normalizedSkill === category;
            return matchesSearch && matchesCategory;
        });

        renderSkills(filtered);
    }

    syncSkillFilterOptions();
    setActivePill(categorySelect.value || "");

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", () => {
        setActivePill(categorySelect.value || "");
        applyFilters();
    });

    pillButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const value = button.getAttribute("data-skill-pill") || "";
            categorySelect.value = value;
            setActivePill(value);
            applyFilters();
        });
    });
}

function bindFeedbackModal() {
    const feedbackLink = element("nav-feedback-link");
    const modal = element("feedback-modal");
    const closeBtn = element("feedback-modal-close");
    
    if (!feedbackLink || !modal || !closeBtn) return;
    
    feedbackLink.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        modal.querySelector("input")?.focus();
    });
    
    const closeModal = () => {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    };
    
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    });
}

async function bootstrap() {
    initTheme();
    initNavigation();
    initAnimations();

    bindContactForms();
    bindFeedbackModal();
    bindHeroBiographyPopup();
    updateCompareBanner();

    if (document.body.dataset.page === "welcome") {
        const about = await aboutApi.getPublic().catch(() => null);
        if (about?.data) {
            renderAbout(about.data);
        }
        renderAboutMetrics(null);
        return;
    }

    if (document.body.dataset.page === "feedback") {
        const about = await aboutApi.getPublic().catch(() => null);
        if (about?.data) {
            renderAbout(about.data);
        }
        renderAboutMetrics(null);
        return;
    }

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
        state.skills = (skills.value.data || []).filter(isDisplayedRecord);
        syncSkillFilterOptions();
        renderSkills(state.skills);
    } else {
        state.skills = [];
        syncSkillFilterOptions();
        renderSkills([]);
    }

    const resumeError = resume.status === "rejected" && resume.reason?.status !== 404
        ? (resume.reason?.message || "Resume metadata is unavailable.")
        : "";

    renderKnowledge(
        resume.status === "fulfilled" ? resume.value.data : null,
        certifications.status === "fulfilled" ? (certifications.value.data || []).filter(isDisplayedRecord) : [],
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
