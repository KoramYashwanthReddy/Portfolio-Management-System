const ACCENTS = ["blue", "violet"];

export function initTheme() {
    // Keep legacy accent support if needed
    const savedAccent = localStorage.getItem("pms-accent") || ACCENTS[0];
    document.body.dataset.accent = savedAccent;

    // Dark/Light Theme setup
    const savedTheme = localStorage.getItem("pms-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    document.documentElement.dataset.theme = initialTheme;
    document.body.dataset.theme = initialTheme;
    updateThemeIcon(initialTheme);

    // Bind to theme-toggle buttons using event delegation
    document.addEventListener("click", (e) => {
        const button = e.target.closest(".theme-toggle");
        if (button) {
            const currentTheme = document.documentElement.dataset.theme;
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            
            document.documentElement.dataset.theme = newTheme;
            document.body.dataset.theme = newTheme;
            localStorage.setItem("pms-theme", newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function updateThemeIcon(theme) {
    document.querySelectorAll(".theme-toggle i").forEach(icon => {
        if (theme === "dark") {
            icon.className = "fa-solid fa-sun";
        } else {
            icon.className = "fa-solid fa-moon";
        }
    });
}
