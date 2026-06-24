export function initNavigation() {
    const nav = document.getElementById("site-nav") || document.querySelector(".site-nav");
    const toggle = document.getElementById("nav-toggle") || document.querySelector(".nav-toggle");
    const header = document.querySelector(".site-header");

    if (!nav || !toggle) {
        return;
    }

    const indicator = document.createElement("div");
    indicator.className = "section-indicator";
    indicator.setAttribute("aria-live", "polite");
    indicator.textContent = "Home";
    if (header) {
        header.insertBefore(indicator, header.querySelector(".header-actions") || header.children[header.children.length - 1]);
    }

    // ── Mobile drawer open/close ──────────────────────────────────────────
    function openNav() {
        nav.classList.add("open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("nav-open");
    }

    function closeNav() {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
    }

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.contains("open");
        isOpen ? closeNav() : openNav();
    });

    document.addEventListener("click", (event) => {
        if (!nav.classList.contains("open")) return;
        if (nav.contains(event.target) || toggle.contains(event.target)) return;
        closeNav();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("open")) {
            closeNav();
        }
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeNav());
    });

    // ── Active link tracking ──────────────────────────────────────────────
    const hashLinks = Array.from(nav.querySelectorAll("a[href^='#']")).filter((link) => link.getAttribute("href") !== "#");
    const sectionIds = hashLinks.map((link) => new URL(link.href, window.location.href).hash.slice(1));
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    function labelForId(id) {
        const mapping = {
            "command-center": "Home",
            overview: "About",
            ecosystem: "Stack",
            knowledge: "Resume",
            collaboration: "Contact"
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
        let bestScore = -Infinity;

        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            const ratio = rect.height ? visibleHeight / rect.height : 0;
            const distance = Math.abs(rect.top - 140);
            const score = ratio * 100 - distance / 10;
            if (score > bestScore) {
                bestScore = score;
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
