/* POMPUI shared chrome — AI notice + Home button on every page.
 * Canonical source: pompui.de repo → sites/landing-page/html/shared/
 * Loaded by every app from https://pompui.de/shared/.
 * Styling hooks come from pompui-chrome.css and the host page's
 * CSS custom properties where available. */

(function () {
    "use strict";

    var IMPRESSUM_URL = "https://pompui.de/datenschutz";
    var HOME_URL = "https://pompui.de/";

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text) node.textContent = text;
        return node;
    }

    function buildAiNote() {
        var a = el("a", "pompui-chrome__ai-note");
        a.href = DATENSCHUTZ_URL;
        a.title = "Diese Seite wurde mit Unterstützung von KI erstellt";
        a.setAttribute("aria-label", "Hinweis: Diese Seite wurde mit Unterstützung von KI erstellt. Zur Datenschutzerklärung.");
        a.textContent = "✳ Mit KI erstellt";
        return a;
    }

    function buildHomeButton() {
        var a = el("a", "pompui-chrome__home");
        a.href = HOME_URL;
        a.title = "Zurück zur POMPUI Startseite";
        a.setAttribute("aria-label", "Zurück zur POMPUI Startseite");

        var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M3 11.5 12 4l9 7.5M6 10v10h12V10");
        icon.appendChild(path);

        var label = el("span", "pompui-chrome__home-label", "Home");
        a.appendChild(icon);
        a.appendChild(label);
        return a;
    }

    function mount() {
        if (document.querySelector(".pompui-chrome__ai-note")) return; // already present (static pages ship their own)
        if (document.body.dataset && document.body.dataset.pompuiHome === "off") return;

        document.body.appendChild(buildAiNote());
        document.body.appendChild(buildHomeButton());
        document.body.classList.add("pompui-chrome-mounted");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
}());