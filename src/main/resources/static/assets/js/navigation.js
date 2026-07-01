export function initNavigation() {
    const nav = document.getElementById("site-nav") || document.querySelector(".site-nav");
    const toggle = document.getElementById("nav-toggle") || document.querySelector(".nav-toggle");
    const header = document.querySelector(".site-header");
    const moreWrap = document.querySelector(".nav-more-wrap");
    const moreToggle = document.getElementById("nav-more-toggle");
    const moreMenu = document.getElementById("nav-more-menu");

    if (!nav || !toggle) {
        return;
    }

    if (nav.dataset.navBound === "true") {
        return;
    }
    nav.dataset.navBound = "true";

    const indicator = document.createElement("div");
    indicator.className = "section-indicator";
    indicator.setAttribute("aria-live", "polite");
    indicator.textContent = "I AM";
    header?.querySelectorAll(".section-indicator").forEach((existing) => existing.remove());
    if (header) {
        header.insertBefore(indicator, header.querySelector(".header-actions") || header.children[header.children.length - 1]);
    }

    // ── Mobile drawer open/close ──────────────────────────────────────────
    function openNav() {
        closeMoreMenu();
        nav.classList.add("open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("nav-open");
    }

    function closeNav() {
        closeMoreMenu();
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
    }

    function openMoreMenu() {
        if (!moreWrap || !moreToggle || !moreMenu) {
            return;
        }
        moreWrap.classList.add("open");
        moreToggle.setAttribute("aria-expanded", "true");
    }

    function closeMoreMenu() {
        if (!moreWrap || !moreToggle || !moreMenu) {
            return;
        }
        moreWrap.classList.remove("open");
        moreToggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.contains("open");
        isOpen ? closeNav() : openNav();
    });

    moreToggle?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!moreMenu) {
            return;
        }
        const isOpen = moreWrap?.classList.contains("open");
        isOpen ? closeMoreMenu() : openMoreMenu();
    });

    document.addEventListener("click", (event) => {
        if (!nav.classList.contains("open")) return;
        if (nav.contains(event.target) || toggle.contains(event.target)) return;
        closeNav();
    });

    document.addEventListener("click", (event) => {
        if (!moreWrap || !moreMenu || !moreWrap.classList.contains("open")) {
            return;
        }
        if (moreWrap.contains(event.target)) {
            return;
        }
        closeMoreMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("open")) {
            closeNav();
        }
        if (event.key === "Escape" && moreWrap?.classList.contains("open")) {
            closeMoreMenu();
        }
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeNav());
        link.addEventListener("click", () => closeMoreMenu());
    });

    // ── Active link tracking ──────────────────────────────────────────────
    const hashLinks = Array.from(nav.querySelectorAll("a[href^='#']")).filter((link) => link.getAttribute("href") !== "#");
    const sectionIds = hashLinks.map((link) => new URL(link.href, window.location.href).hash.slice(1));
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    function labelForId(id) {
        const mapping = {
            "command-center": "I AM",
            overview: "About",
            ecosystem: "Stack",
            systems: "Projects",
            knowledge: "Resume",
            certifications: "Certificates",
            faq: "FAQ",
            collaboration: "Contact",
            feedback: "Feedback"
        };
        return mapping[id] || id.replace(/-/g, " ");
    }

    function setActiveLink(id) {
        const normalized = id.startsWith("#") ? id : `#${id}`;
        hashLinks.forEach((link) => {
            const hash = new URL(link.href, window.location.href).hash;
            const isActive = hash === normalized;
            link.classList.toggle("is-active", isActive);
            link.setAttribute("aria-current", isActive ? "page" : "false");
        });
        if (indicator) {
            const activeId = normalized.slice(1);
            indicator.textContent = labelForId(activeId);
        }
    }

    hashLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const hash = new URL(link.href, window.location.href).hash;
            setActiveLink(hash);
        });
    });

    let ticking = false;
    function updateActiveSection() {
        if (!sections.length) {
            return;
        }

        let activeSection = sections[0];
        const markerLine = Math.max(120, Math.round(window.innerHeight * 0.28));

        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const inMarkerBand = rect.top <= markerLine && rect.bottom >= markerLine;
            if (inMarkerBand) {
                activeSection = section;
                return;
            }

            const currentDistance = Math.abs(rect.top - markerLine);
            const activeDistance = Math.abs(activeSection.getBoundingClientRect().top - markerLine);
            if (currentDistance < activeDistance) {
                activeSection = section;
            }
        });

        setActiveLink(`#${activeSection.id}`);
    }

    function scheduleUpdate() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateActiveSection();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", () => {
        setActiveLink(window.location.hash || "#command-center");
    });

    updateActiveSection();
    setActiveLink(window.location.hash || "#command-center");
}
