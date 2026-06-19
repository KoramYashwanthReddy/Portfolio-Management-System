export function initNavigation() {
    const nav = document.getElementById("site-nav") || document.querySelector(".site-nav");
    const toggle = document.getElementById("nav-toggle") || document.querySelector(".nav-toggle");

    if (!nav || !toggle) {
        return;
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

    // Close when clicking outside the nav (on the overlay)
    document.addEventListener("click", (event) => {
        if (!nav.classList.contains("open")) return;
        if (nav.contains(event.target) || toggle.contains(event.target)) return;
        closeNav();
    });

    // Close when Escape is pressed
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("open")) {
            closeNav();
        }
    });

    // Close nav on any link click (including #-links)
    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeNav());
    });

    // ── Active link tracking ──────────────────────────────────────────────
    const hashLinks = Array.from(nav.querySelectorAll("a[href^='#']"));

    function setActiveLink(id) {
        hashLinks.forEach((link) => {
            const hash = new URL(link.href, window.location.href).hash;
            link.classList.toggle("is-active", hash === id);
        });
    }

    // Set active on click
    hashLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const hash = new URL(link.href, window.location.href).hash;
            setActiveLink(hash);
        });
    });

    // Update on hash change
    window.addEventListener("hashchange", () => {
        setActiveLink(window.location.hash || "#command-center");
    });

    // ── IntersectionObserver for scroll-based active state ────────────────
    const sections = document.querySelectorAll("section[id], div[id]");
    if (sections.length && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveLink(`#${entry.target.id}`);
                    }
                });
            },
            {
                rootMargin: "-30% 0px -60% 0px",
                threshold: 0
            }
        );
        sections.forEach((section) => observer.observe(section));
    }

    // Initial active state
    setActiveLink(window.location.hash || "#command-center");
}
