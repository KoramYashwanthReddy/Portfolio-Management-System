export function initNavigation() {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");

    if (!nav || !toggle) {
        return;
    }

    toggle.setAttribute("aria-expanded", "false");

    const links = Array.from(nav.querySelectorAll("a[href^='#']"));

    function setActiveLink(targetHash) {
        links.forEach((link) => {
            const hash = new URL(link.href, window.location.href).hash;
            link.classList.toggle("is-active", hash === targetHash);
        });
    }

    setActiveLink(window.location.hash || "#welcome");

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.forEach((link) => {
        link.addEventListener("click", () => nav.classList.remove("open"));
        link.addEventListener("click", () => toggle.setAttribute("aria-expanded", "false"));
        link.addEventListener("click", () => setActiveLink(new URL(link.href, window.location.href).hash));
    });

    document.addEventListener("click", (event) => {
        if (!nav.classList.contains("open")) {
            return;
        }
        if (nav.contains(event.target) || toggle.contains(event.target)) {
            return;
        }
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    });

    window.addEventListener("hashchange", () => {
        setActiveLink(window.location.hash || "#welcome");
    });
}
