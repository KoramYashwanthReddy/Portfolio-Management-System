export function initNavigation() {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");

    toggle?.addEventListener("click", () => nav?.classList.toggle("open"));

    nav?.querySelectorAll("a[href^='#']").forEach((link) => {
        link.addEventListener("click", () => nav.classList.remove("open"));
    });
}
