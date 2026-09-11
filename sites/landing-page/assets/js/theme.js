(function () {
    "use strict";

    const STORAGE_KEY = "pompui-color-mode";
    const root = document.documentElement;
    const systemPreference = window.matchMedia("(prefers-color-scheme: light)");

    const storedMode = () => {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === "light" || value === "dark" ? value : null;
        } catch {
            return null;
        }
    };

    const preferredMode = () => storedMode() || (systemPreference.matches ? "light" : "dark");

    const updateControls = (mode) => {
        const nextMode = mode === "dark" ? "light" : "dark";
        const nextLabel = nextMode === "light" ? "Lightmode aktivieren" : "Darkmode aktivieren";

        document.querySelectorAll("[data-color-mode-toggle]").forEach((button) => {
            button.setAttribute("aria-label", nextLabel);
            button.setAttribute("title", nextLabel);
            button.setAttribute("aria-pressed", String(mode === "light"));
        });

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute("content", mode === "light" ? "#eef4f1" : "#07110f");
        }
    };

    const applyMode = (mode, persist) => {
        const normalizedMode = mode === "light" ? "light" : "dark";
        root.dataset.colorMode = normalizedMode;
        root.style.colorScheme = normalizedMode;
        updateControls(normalizedMode);

        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEY, normalizedMode);
            } catch {
                // Storage may be unavailable. The current page still keeps the selected mode.
            }
        }

        window.dispatchEvent(new CustomEvent("pompui:color-mode-change", {
            detail: { mode: normalizedMode }
        }));
    };

    document.querySelectorAll("[data-color-mode-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            applyMode(root.dataset.colorMode === "light" ? "dark" : "light", true);
        });
    });

    systemPreference.addEventListener("change", () => {
        if (!storedMode()) {
            applyMode(preferredMode(), false);
        }
    });

    window.PompuiTheme = {
        getMode: () => root.dataset.colorMode || preferredMode(),
        setMode: (mode) => applyMode(mode, true)
    };

    applyMode(root.dataset.colorMode || preferredMode(), false);
}());
