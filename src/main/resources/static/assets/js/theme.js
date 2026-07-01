const ACCENTS = ["blue", "violet"];
const THEME_BACKGROUNDS = {
    dark: "#000000",
    light: "#fdfdfd"
};

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures so theme bootstrap never blocks the page.
    }
}

function syncThemeCanvas(theme) {
    const backgroundColor = THEME_BACKGROUNDS[theme] || THEME_BACKGROUNDS.light;
    document.documentElement.style.backgroundColor = backgroundColor;
    if (document.body) {
        document.body.style.backgroundColor = backgroundColor;
    }
}

export function initTheme() {
    // Keep legacy accent support if needed
    const savedAccent = safeStorageGet("pms-accent") || ACCENTS[0];
    document.body.dataset.accent = savedAccent;

    // Dark/Light Theme setup
    const savedTheme = safeStorageGet("pms-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    document.documentElement.dataset.theme = initialTheme;
    document.body.dataset.theme = initialTheme;
    syncThemeCanvas(initialTheme);
    updateThemeIcon(initialTheme);

    // Bind to theme-toggle buttons using event delegation
    document.addEventListener("click", (e) => {
        const button = e.target.closest(".theme-toggle");
        if (button) {
            const currentTheme = document.documentElement.dataset.theme;
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            
            document.documentElement.dataset.theme = newTheme;
            document.body.dataset.theme = newTheme;
            syncThemeCanvas(newTheme);
            safeStorageSet("pms-theme", newTheme);
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
