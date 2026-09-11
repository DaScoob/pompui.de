(function () {
    "use strict";

    let mode;
    try {
        mode = localStorage.getItem("pompui-color-mode");
    } catch {
        mode = null;
    }

    if (mode !== "light" && mode !== "dark") {
        mode = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    document.documentElement.dataset.colorMode = mode;
}());
