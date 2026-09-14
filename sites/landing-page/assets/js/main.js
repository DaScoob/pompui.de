(function () {
    "use strict";

    const wheelStylesheet = document.createElement("link");
    wheelStylesheet.rel = "stylesheet";
    wheelStylesheet.href = "/assets/css/activity-wheel-v19.css";
    document.head.append(wheelStylesheet);

    const isProduction = /(^|\.)pompui\.de$/.test(window.location.hostname);
    const port = (value) => (isProduction ? "" : ":" + value);
    const appUrl = {
        garden: `http${isProduction ? "s" : ""}://${isProduction ? "gj.pompui.de" : window.location.hostname + port(6013)}/`,
        snapotter: `http${isProduction ? "s" : ""}://${isProduction ? "snapotter.pompui.de" : window.location.hostname + port(6014)}/`,
        punctum: `http${isProduction ? "s" : ""}://${isProduction ? "punctum.pompui.de" : window.location.hostname + port(6012)}/`,
        vtracer: `http${isProduction ? "s" : ""}://${isProduction ? "vtracer.pompui.de" : window.location.hostname + port(6015)}/`
    };

    const categories = [
        { id: "garden-life", title: "Garten & Alltag" },
        { id: "media-design", title: "Medien & Gestaltung" },
        { id: "time-focus", title: "Zeit & Fokus" },
        { id: "learning", title: "Lernen & Wissen" },
        { id: "leisure", title: "Spiele & Freizeit" },
        { id: "technology", title: "Technik & Werkzeuge" }
    ];

    const subscriptionActivity = {
        id: "subscriptions",
        title: "Aktivitäten abonnieren",
        status: "Auswahl",
        description: "Aktivitäten und Kategorien für das persönliche Rad auswählen.",
        meta: "Position 0 · Auswahl verwalten",
        accent: "#78807c",
        accentRgb: "120, 128, 124",
        href: "",
        repo: "",
        action: "",
        system: true
    };

    const activities = [
        {
            id: "garden",
            category: "garden-life",
            title: "Gartenjournal",
            status: "Bereit",
            description: "Beete gestalten, Kulturen verwalten und das Gartenjahr im Blick behalten.",
            meta: "Planen · Pflegen · Ernten",
            accent: "#9bea75",
            accentRgb: "155, 234, 117",
            href: appUrl.garden,
            repo: "https://github.com/DaScoob/Garden-Journal",
            action: "Aktivität starten"
        },
        {
            id: "snapotter",
            category: "media-design",
            title: "SnapOtter",
            status: "Bereit",
            description: "200+ Werkzeuge für Bilder, Video, Audio, PDFs und Dokumente — auf dem eigenen Server.",
            meta: "Konvertieren · Komprimieren · KI · AGPL-3.0",
            accent: "#e07832",
            accentRgb: "224, 120, 50",
            href: appUrl.snapotter,
            repo: "https://github.com/snapotter-hq/SnapOtter",
            action: "Aktivität starten"
        },
        {
            id: "punctum",
            category: "time-focus",
            title: "Punctum",
            status: "Bereit",
            description: "Stoppuhr, Timer, Wecker und Pomodoro — präzise Zeit-Instrumente ohne Drift.",
            meta: "Messen · Erinnern · Fokussieren",
            accent: "#b28cff",
            accentRgb: "178, 140, 255",
            href: appUrl.punctum,
            repo: "https://github.com/GitMinIT/Punctum",
            action: "Aktivität starten"
        },
        {
            id: "vtracer",
            category: "media-design",
            title: "VTracer",
            status: "Bereit",
            description: "Raster in Vektor: PNG und JPG in saubere SVG-Grafiken umwandeln.",
            meta: "Umwandeln · Vektorisieren · Lokal",
            accent: "#3ec6b8",
            accentRgb: "62, 198, 184",
            href: appUrl.vtracer,
            repo: "https://github.com/visioncortex/vtracer",
            action: "Aktivität starten"
        }
    ];

    const dummyActivities = [
        ["beet-oracle", "garden-life", "Beet-Orakel", "Fruchtfolgen spielerisch vergleichen.", "Garten · Planung"],
        ["harvest-clock", "garden-life", "Ernteuhr", "Erntefenster und Reifezeiten gesammelt betrachten.", "Garten · Kalender"],
        ["pantry-pilot", "garden-life", "VorratsPilot", "Vorräte und geplante Einkäufe überblicken.", "Alltag · Vorrat"],
        ["rain-notebook", "garden-life", "RegenNotiz", "Niederschläge und Gießroutinen notieren.", "Garten · Wetter"],
        ["palette-forge", "media-design", "PalettenSchmiede", "Farbwelten sammeln und miteinander vergleichen.", "Farbe · Gestaltung"],
        ["type-specimen", "media-design", "Typografie-Labor", "Schriften und Lesbarkeit in verschiedenen Größen prüfen.", "Schrift · Layout"],
        ["sound-cabinet", "media-design", "KlangKabinett", "Kurze Klangfolgen ordnen und wiederfinden.", "Audio · Sammlung"],
        ["poster-studio", "media-design", "Plakatwerkstatt für lange Überschriften", "Plakatideen mit bewusst langen Bezeichnungen vorbereiten.", "Layout · Entwurf"],
        ["deep-work", "time-focus", "Fokusraum", "Arbeitsphasen ruhig strukturieren.", "Fokus · Ruhe"],
        ["routine-loop", "time-focus", "Routine-Schleife", "Wiederkehrende Abläufe übersichtlich planen.", "Routine · Planung"],
        ["pause-compass", "time-focus", "Pausenkompass", "Erholungsphasen passend verteilen.", "Pause · Rhythmus"],
        ["week-sculptor", "time-focus", "Wochenformer", "Aufgaben und freie Zeit in Einklang bringen.", "Woche · Übersicht"],
        ["word-vault", "learning", "Wortschatz-Tresor", "Begriffe und eigene Erläuterungen sammeln.", "Sprache · Wissen"],
        ["formula-deck", "learning", "Formelkarten", "Formeln als kompakte Lernkarten organisieren.", "Mathematik · Lernen"],
        ["history-thread", "learning", "Geschichtsfaden", "Ereignisse auf einer Zeitleiste verbinden.", "Geschichte · Kontext"],
        ["curiosity-index", "learning", "Neugier-Index", "Offene Fragen für spätere Recherchen festhalten.", "Wissen · Recherche"],
        ["dice-parlor", "leisure", "Würfelsalon", "Kleine Würfelspiele für zwischendurch.", "Spiel · Zufall"],
        ["story-weaver", "leisure", "Geschichtenweber", "Gemeinsame Erzählideen miteinander verknüpfen.", "Spiel · Kreativität"],
        ["trail-bingo", "leisure", "Spaziergang-Bingo", "Entdeckungen unterwegs spielerisch sammeln.", "Freizeit · Draußen"],
        ["puzzle-dock", "leisure", "Rätselhafen", "Kurze Logikrätsel nach Schwierigkeit sortieren.", "Rätsel · Logik"],
        ["json-lantern", "technology", "JSON-Laterne", "Strukturierte Daten lesbar untersuchen.", "Daten · Analyse"],
        ["request-bench", "technology", "API-Werkbank", "HTTP-Anfragen zusammenstellen und dokumentieren.", "API · Entwicklung"],
        ["signal-map", "technology", "Signalatlas", "Messwerte und Funkstrecken gegenüberstellen.", "Funk · Messung"],
        ["state-machine-observatory", "technology", "Zustandsautomaten-Beobachtungsstation", "Zustände und Übergänge anschaulich nachvollziehen.", "Systeme · Entwicklung"]
    ];

    const dummyAccents = [
        ["#78dca2", "120, 220, 162"],
        ["#f0b75a", "240, 183, 90"],
        ["#5fcbd8", "95, 203, 216"],
        ["#ee7f96", "238, 127, 150"],
        ["#a796ff", "167, 150, 255"],
        ["#d5d86c", "213, 216, 108"]
    ];

    dummyActivities.forEach((entry, index) => {
        const accent = dummyAccents[index % dummyAccents.length];
        activities.push({
            id: entry[0],
            category: entry[1],
            title: entry[2],
            status: "Inaktiv",
            description: entry[3],
            meta: entry[4] + " · Vorschau",
            accent: accent[0],
            accentRgb: accent[1],
            href: "",
            repo: "",
            action: "Noch nicht verfügbar"
        });
    });

    const iconPaths = {
        subscriptions: ["M15 15h14v14H15z", "M35 15h14v14H35z", "M15 35h14v14H15z", "M35 35h14v14H35z"],
        garden: ["M32 54V27", "M32 35C22 35 14 29 13 18c11-1 18 4 19 17Z", "M32 28c1-10 8-16 19-16 0 11-8 17-19 16Z", "M18 54h28"],
        snapotter: ["M10 20h44v30H10z", "M26 20v-6h12v6", "M10 32h44", "M20 40h6M38 40h6"],
        punctum: ["M32 15a17 17 0 1 1-17 17 17 17 0 0 1 17-17Z", "M32 21v11l8 7", "M49 32h5M10 32h5M32 15v-5M32 49v5"],
        vtracer: ["M10 14h30v30H10z", "M14 38 24 26l8 8 6-6 8 12", "M26 50l8-12 8 12"],
        "garden-life": ["M16 49c15-2 26-14 32-34 3 20-6 35-26 36", "M19 48c5-11 13-19 25-28"],
        "media-design": ["M14 16h36v32H14z", "M20 40l9-10 7 7 5-6 5 9", "M23 25h.01"],
        "time-focus": ["M32 13a19 19 0 1 1-19 19 19 19 0 0 1 19-19Z", "M32 21v12l8 5"],
        learning: ["M12 18c8-3 14-2 20 3v30c-6-5-12-6-20-3Z", "M52 18c-8-3-14-2-20 3v30c6-5 12-6 20-3Z"],
        leisure: ["M17 24h30l7 22-8 4-8-9H26l-8 9-8-4Z", "M23 31v10M18 36h10M42 32h.01M47 38h.01"],
        technology: ["M18 18h28v28H18z", "M25 25h14v14H25z", "M18 26h-6M18 38h-6M52 26h-6M52 38h-6M26 18v-6M38 18v-6M26 52v-6M38 52v-6"]
    };

    const storageKey = "pompui-activity-subscriptions-v2";
    const lastActivityKey = "pompui-last-activity-v2";
    const root = document.documentElement;
    const page = document.body;
    const carousel = document.querySelector("[data-carousel]");
    const details = document.querySelector("[data-activity-details]");
    const count = document.querySelector("[data-activity-count]");
    const status = document.querySelector("[data-activity-status]");
    const title = document.querySelector("[data-activity-title]");
    const description = document.querySelector("[data-activity-description]");
    const meta = document.querySelector("[data-activity-meta]");
    const action = document.querySelector("[data-activity-action]");
    const flash = document.querySelector("[data-selection-flash]");
    const year = document.querySelector("[data-current-year]");
    const clockTime = document.querySelector("[data-clock-time]");
    const dialog = document.querySelector("[data-subscription-dialog]");
    const dialogContent = document.querySelector("[data-subscription-content]");
    const dialogCount = document.querySelector("[data-subscription-count]");
    const confirmDialogButton = document.querySelector("[data-subscription-confirm]");
    const compass = document.querySelector("[data-wheel-home]");
    const controls = Array.from(document.querySelectorAll("[data-direction]"));

    let subscriptions = readSubscriptions();
    let pendingSubscriptions = new Set(subscriptions);
    let visibleActivities = [];
    let tiles = [];
    let activeIndex = 0;
    let currentPosition = 0;
    let targetPosition = 0;
    let animationFrame = 0;
    let lastAnimationTime = 0;
    let changeToken = 0;
    let pointerStart = null;
    let suppressClickUntil = 0;
    let sceneFrame = 0;

    function readSubscriptions() {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored === null) return new Set();
            const ids = JSON.parse(stored);
            if (Array.isArray(ids)) {
                const knownIds = new Set(activities.map((activity) => activity.id));
                return new Set(ids.filter((id) => knownIds.has(id)));
            }
        } catch { /* storage unavailable or invalid — start without subscriptions */ }
        return new Set();
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function createActivityIcon(activity, contextClass) {
        if (activity.iconSrc) {
            const image = document.createElement("img");
            image.classList.add("activity-icon");
            if (contextClass) image.classList.add(contextClass);
            image.src = activity.iconSrc;
            image.alt = "";
            image.setAttribute("aria-hidden", "true");
            return image;
        }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("activity-icon");
        if (contextClass) svg.classList.add(contextClass);
        svg.setAttribute("viewBox", "0 0 64 64");
        svg.setAttribute("aria-hidden", "true");
        const paths = iconPaths[activity.id] || iconPaths[activity.category] || iconPaths.technology;
        paths.forEach((pathData) => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            svg.append(path);
        });
        return svg;
    }

    function updateLogoAccent(accent) {
        if (window.PompuiLogo) window.PompuiLogo.setAccent(accent);
    }

    function normalizedIndex(index) {
        const total = visibleActivities.length;
        return total ? ((index % total) + total) % total : 0;
    }

    function createTile(activity, index) {
        const tile = createElement("button", "activity-tile");
        tile.type = "button";
        tile.dataset.activityId = activity.id;
        tile.dataset.index = String(index);
        tile.setAttribute("aria-current", "false");
        if (activity.system) tile.classList.add("activity-tile--system");

        const surface = createElement("span", "activity-tile__surface");
        surface.append(createElement("span", "activity-tile__shine"), createActivityIcon(activity, "activity-tile__icon"));
        tile.append(surface, createElement("span", "activity-tile__label", activity.title));
        tile.addEventListener("click", () => {
            if (Date.now() < suppressClickUntil) return;
            const currentIndex = visibleActivities.findIndex((item) => item.id === activity.id);
            if (currentIndex < 0) return;
            if (currentIndex === activeIndex) {
                if (activity.system) {
                    openSubscriptionDialog();
                } else if (activity.href) {
                    window.open(activity.href, "_self");
                }
                return;
            }
            goToIndex(currentIndex, true);
        });
        return tile;
    }

    function renderAction(activity) {
        action.replaceChildren();
        if (activity.system) return;
        if (!activity.href) {
            const unavailable = createElement("span", "launch-button--disabled", activity.action);
            unavailable.setAttribute("aria-disabled", "true");
            action.append(unavailable);
            return;
        }

        if (activity.repo) {
            const repoLink = createElement("a", "repo-button");
            repoLink.href = activity.repo;
            repoLink.target = "_blank";
            repoLink.rel = "noopener noreferrer";
            repoLink.title = "Quellcode auf GitHub öffnen";
            repoLink.setAttribute("aria-label", `Quellcode von ${activity.title} auf GitHub öffnen`);
            const repoIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            repoIcon.setAttribute("viewBox", "0 0 16 16");
            repoIcon.setAttribute("aria-hidden", "true");
            const repoPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            repoPath.setAttribute("d", "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z");
            repoIcon.append(repoPath);
            repoLink.append(repoIcon);
            action.append(repoLink);
        }

        const link = createElement("a", "launch-button");
        link.href = activity.href;
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M5 12h14m-6-6 6 6-6 6");
        icon.append(path);
        link.append(createElement("span", "", activity.action), icon);
        action.append(link);
    }

    function updateDetails(activity) {
        changeToken += 1;
        const token = changeToken;
        details.classList.add("is-changing");
        window.requestAnimationFrame(() => {
            if (token !== changeToken) return;
            if (activity.system) {
                count.textContent = "Position 0";
            } else {
                count.textContent = `${String(activeIndex).padStart(2, "0")} / ${String(visibleActivities.length - 1).padStart(2, "0")}`;
            }
            status.textContent = activity.status;
            title.textContent = activity.title;
            description.textContent = activity.description;
            meta.textContent = activity.meta;
            renderAction(activity);
            details.classList.remove("is-changing");
        });
    }

    function pulseScene() {
        if (!flash) return;
        flash.classList.remove("is-active");
        void flash.offsetWidth;
        flash.classList.add("is-active");
    }

    function selectIndex(index, shouldFocus, forceUpdate) {
        const normalized = normalizedIndex(index);
        const hasChanged = normalized !== activeIndex;
        if (!hasChanged && !forceUpdate) {
            if (shouldFocus) tiles[activeIndex]?.focus({ preventScroll: true });
            return;
        }
        activeIndex = normalized;
        const activity = visibleActivities[activeIndex];
        root.style.setProperty("--accent", activity.accent);
        root.style.setProperty("--accent-rgb", activity.accentRgb);
        updateLogoAccent(activity.accent);
        page.dataset.theme = activity.id;
        try { localStorage.setItem(lastActivityKey, activity.id); } catch { /* storage blocked */ }
        tiles.forEach((tile, tileIndex) => {
            const isActive = tileIndex === activeIndex;
            tile.classList.toggle("is-active", isActive);
            tile.setAttribute("aria-current", String(isActive));
            tile.setAttribute("aria-label", visibleActivities[tileIndex].title + (isActive ? " — erneut aktivieren" : " auswählen"));
            tile.tabIndex = isActive ? 0 : -1;
        });
        updateDetails(activity);
        if (hasChanged) pulseScene();
        if (shouldFocus) tiles[activeIndex]?.focus({ preventScroll: true });
    }

    function updateSelectedFromTarget(shouldFocus) {
        selectIndex(Math.round(targetPosition), shouldFocus);
    }

    function renderWheelPositions() {
        const total = visibleActivities.length;
        if (!total) return;

        const compact = window.innerWidth <= 768;
        const width = carousel.clientWidth;
        const tileWidth = tiles[0]?.offsetWidth || (compact ? 86 : 152);
        const baseGap = compact ? 20 : 35;

        // Sites v19: the v18 mathematical centre distance was doubled and
        // then reduced by 25 %, resulting in 150 % of the v17 base distance.
        const minimumCentreDistance = (tileWidth + baseGap) * 1.5;
        const angleStep = (2 * Math.PI) / total;
        const minimumRadius = total > 1
            ? minimumCentreDistance / (2 * Math.sin(Math.PI / total))
            : 0;
        const radius = Math.max(width * 0.4, minimumRadius);

        // Keep the radial screen depth fixed. The physical tilt therefore
        // becomes flatter automatically as the wheel radius grows.
        const radialDepth = compact ? 42 : 52;
        const tilt = Math.asin(Math.min(0.98, radialDepth / Math.max(radius, 1)));
        const sinTilt = Math.sin(tilt);
        const cosTilt = Math.cos(tilt);
        const cameraDistance = Math.max(radius * 4, 1);
        const frontPerspective = cameraDistance / (cameraDistance - radius * cosTilt);
        const verticalOffset = compact ? -8 : -12;
        const halfViewport = window.innerWidth / 2;
        const fadeWidth = Math.min(window.innerWidth * 0.1, compact ? 56 : 96);
        const fadeEnd = halfViewport;
        const fadeStart = Math.max(0, fadeEnd - fadeWidth);

        const project = (angle) => {
            const sinAngle = Math.sin(angle);
            const cosAngle = Math.cos(angle);
            const z = cosAngle * radius * cosTilt;
            const perspective = (cameraDistance / (cameraDistance - z)) / frontPerspective;
            const depth = (cosAngle + 1) / 2;
            return {
                x: sinAngle * radius * perspective,
                y: cosAngle * radius * sinTilt * perspective + verticalOffset,
                scale: perspective,
                depth
            };
        };

        carousel.style.setProperty("--ring-width", `${(radius * 2).toFixed(2)}px`);
        carousel.style.setProperty("--ring-height", `${(radialDepth * 2).toFixed(2)}px`);

        tiles.forEach((tile, index) => {
            const rawOffset = index - currentPosition;
            const wrappedOffset = ((rawOffset + total / 2) % total + total) % total - total / 2;
            const angle = wrappedOffset * angleStep;
            const projected = project(angle);
            const scaledHalfTile = tileWidth * projected.scale / 2;
            const outerEdge = Math.abs(projected.x) + scaledHalfTile;

            let edgeOpacity = 1;
            if (outerEdge >= fadeEnd) {
                edgeOpacity = 0;
            } else if (outerEdge > fadeStart) {
                const t = (fadeEnd - outerEdge) / Math.max(fadeEnd - fadeStart, 1);
                edgeOpacity = t * t * (3 - 2 * t);
            }

            const depthOpacity = 0.28 + projected.depth * 0.72;
            let opacity = edgeOpacity * depthOpacity;
            const isActive = index === activeIndex;

            // The active tile is a hard invariant: it can never be hidden by
            // edge virtualisation or fade calculations.
            if (isActive) opacity = 1;

            const hidden = opacity <= 0.001 && !isActive;
            tile.style.setProperty("--ring-x", `${projected.x.toFixed(2)}px`);
            tile.style.setProperty("--ring-y", `${projected.y.toFixed(2)}px`);
            tile.style.setProperty("--ring-scale", projected.scale.toFixed(3));
            tile.style.setProperty("--ring-opacity", opacity.toFixed(3));
            tile.style.setProperty("--tile-accent", visibleActivities[index].system ? "var(--subscription-gray)" : visibleActivities[index].accent);
            tile.style.zIndex = String(isActive ? 125 : 20 + Math.round(projected.depth * 80));
            if (hidden) tile.setAttribute("aria-hidden", "true");
            else tile.removeAttribute("aria-hidden");
        });

        const zeroOffset = ((-currentPosition + total / 2) % total + total) % total - total / 2;
        const zeroAngle = zeroOffset * angleStep;
        const zeroProjected = project(zeroAngle);
        const compassAngle = Math.atan2(zeroProjected.y - verticalOffset, zeroProjected.x) * 180 / Math.PI + 90;
        compass.style.setProperty("--compass-angle", `${compassAngle.toFixed(2)}deg`);

        const projectedWheelExtent = radius + tileWidth / 2;
        const needsCompass = total > 1 && projectedWheelExtent > fadeStart;
        compass.hidden = !needsCompass;
    }

    function animateWheel(time) {
        const elapsed = lastAnimationTime ? Math.min(time - lastAnimationTime, 40) : 16;
        lastAnimationTime = time;
        const difference = targetPosition - currentPosition;
        const blend = 1 - Math.exp(-elapsed / 72);
        currentPosition += difference * blend;
        if (Math.abs(difference) < 0.001) {
            currentPosition = targetPosition;
            animationFrame = 0;
            lastAnimationTime = 0;
            renderWheelPositions();
            return;
        }
        renderWheelPositions();
        animationFrame = window.requestAnimationFrame(animateWheel);
    }

    function startWheelAnimation() {
        if (!animationFrame) animationFrame = window.requestAnimationFrame(animateWheel);
    }

    function move(direction, shouldFocus) {
        targetPosition += direction;
        updateSelectedFromTarget(Boolean(shouldFocus));
        startWheelAnimation();
    }

    function goToIndex(index, shouldFocus) {
        const total = visibleActivities.length;
        if (!total) return;
        const targetIndex = normalizedIndex(Math.round(targetPosition));
        let delta = index - targetIndex;
        if (delta > total / 2) delta -= total;
        if (delta < -total / 2) delta += total;
        targetPosition += delta;
        updateSelectedFromTarget(Boolean(shouldFocus));
        startWheelAnimation();
    }

    function renderCarousel(preferredId) {
        visibleActivities = [subscriptionActivity, ...activities.filter((activity) => subscriptions.has(activity.id))];
        carousel.replaceChildren();
        tiles = visibleActivities.map((activity, index) => {
            const tile = createTile(activity, index);
            carousel.append(tile);
            return tile;
        });
        controls.forEach((control) => {
            control.disabled = visibleActivities.length <= 1;
        });
        let restoredId = preferredId;
        if (!restoredId) {
            try { restoredId = localStorage.getItem(lastActivityKey); } catch { /* storage blocked */ }
        }
        const restoredIndex = visibleActivities.findIndex((activity) => activity.id === restoredId);
        activeIndex = restoredIndex >= 0 ? restoredIndex : 0;
        currentPosition = activeIndex;
        targetPosition = activeIndex;
        selectIndex(activeIndex, false, true);
        renderWheelPositions();
    }

    function updateDialogState() {
        dialogContent.querySelectorAll("[data-subscription-activity]").forEach((input) => {
            input.checked = pendingSubscriptions.has(input.dataset.subscriptionActivity);
        });
        dialogContent.querySelectorAll("[data-subscription-category]").forEach((input) => {
            const ids = activities.filter((activity) => activity.category === input.dataset.subscriptionCategory).map((activity) => activity.id);
            const selectedCount = ids.filter((id) => pendingSubscriptions.has(id)).length;
            input.checked = selectedCount === ids.length;
            input.indeterminate = selectedCount > 0 && selectedCount < ids.length;
        });
        dialogCount.textContent = `${pendingSubscriptions.size} von ${activities.length} abonniert`;
    }

    function renderSubscriptionDialog() {
        dialogContent.replaceChildren();
        categories.forEach((category) => {
            const section = createElement("section", "subscription-category");
            const header = createElement("label", "subscription-category__header");
            const categoryInput = createElement("input", "subscription-checkbox");
            categoryInput.type = "checkbox";
            categoryInput.dataset.subscriptionCategory = category.id;
            const heading = createElement("span", "subscription-category__title", category.title);
            const categoryTotal = activities.filter((activity) => activity.category === category.id).length;
            header.append(categoryInput, heading, createElement("span", "subscription-category__total", String(categoryTotal)));
            section.append(header);

            const grid = createElement("div", "subscription-grid");
            activities.filter((activity) => activity.category === category.id).forEach((activity) => {
                const item = createElement("label", "subscription-card");
                const input = createElement("input", "subscription-checkbox");
                input.type = "checkbox";
                input.dataset.subscriptionActivity = activity.id;
                const iconSurface = createElement("span", "subscription-card__icon-surface");
                iconSurface.append(createActivityIcon(activity, "subscription-card__icon"));
                const copy = createElement("span", "subscription-card__copy");
                copy.append(
                    createElement("span", "subscription-card__title", activity.title),
                    createElement("span", "subscription-card__meta", activity.status === "Bereit" ? "Verfügbar" : "Vorschau · inaktiv")
                );
                item.style.setProperty("--card-accent", activity.accent);
                item.append(input, iconSurface, copy);
                grid.append(item);
            });
            section.append(grid);
            dialogContent.append(section);
        });
        updateDialogState();
    }

    function openSubscriptionDialog() {
        pendingSubscriptions = new Set(subscriptions);
        renderSubscriptionDialog();
        page.classList.add("has-open-dialog");
        dialog.showModal();
    }

    dialogContent.addEventListener("change", (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (input.dataset.subscriptionActivity) {
            if (input.checked) pendingSubscriptions.add(input.dataset.subscriptionActivity);
            else pendingSubscriptions.delete(input.dataset.subscriptionActivity);
        }
        if (input.dataset.subscriptionCategory) {
            activities.filter((activity) => activity.category === input.dataset.subscriptionCategory).forEach((activity) => {
                if (input.checked) pendingSubscriptions.add(activity.id);
                else pendingSubscriptions.delete(activity.id);
            });
        }
        updateDialogState();
    });

    confirmDialogButton.addEventListener("click", () => {
        subscriptions = new Set(pendingSubscriptions);
        try { localStorage.setItem(storageKey, JSON.stringify(Array.from(subscriptions))); } catch { /* storage blocked */ }
        dialog.close();
        renderCarousel(subscriptionActivity.id);
    });
    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
    });
    dialog.addEventListener("close", () => {
        page.classList.remove("has-open-dialog");
        tiles[0]?.focus({ preventScroll: true });
    });

    compass.addEventListener("click", () => {
        goToIndex(0, false);
    });

    if (year) year.textContent = String(new Date().getFullYear());
    if (clockTime) {
        const renderClock = () => {
            const now = new Date();
            clockTime.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        };
        renderClock();
        setInterval(renderClock, 1000);
    }

    controls.forEach((control) => {
        control.addEventListener("click", () => move(Number(control.dataset.direction), true));
    });

    carousel.addEventListener("keydown", (event) => {
        const keyActions = {
            ArrowLeft: () => move(-1, true),
            ArrowRight: () => move(1, true),
            Home: () => goToIndex(0, true),
            End: () => goToIndex(visibleActivities.length - 1, true)
        };
        const keyAction = keyActions[event.key];
        if (keyAction) {
            event.preventDefault();
            keyAction();
        }
    });

    window.addEventListener("wheel", (event) => {
        if (dialog.open) return;
        event.preventDefault();
        const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (rawDelta === 0) return;
        move(rawDelta > 0 ? 1 : -1, false);
    }, { passive: false });

    carousel.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
            lastAnimationTime = 0;
        }
        targetPosition = currentPosition;
        pointerStart = {
            id: event.pointerId,
            x: event.clientX,
            startX: event.clientX,
            time: performance.now(),
            lastTime: performance.now(),
            velocity: 0,
            startTarget: targetPosition,
            dragging: false
        };
    });

    carousel.addEventListener("pointermove", (event) => {
        if (!pointerStart || pointerStart.id !== event.pointerId) return;
        const now = performance.now();
        const deltaX = event.clientX - pointerStart.startX;
        const distance = Math.abs(deltaX);
        if (distance > 6) {
            pointerStart.dragging = true;
            try { carousel.setPointerCapture(event.pointerId); } catch { /* not supported */ }
        }
        if (!pointerStart.dragging) return;
        const elapsed = Math.max(now - pointerStart.lastTime, 1);
        pointerStart.velocity = (event.clientX - pointerStart.x) / elapsed;
        pointerStart.x = event.clientX;
        pointerStart.lastTime = now;
        const pixelsPerStep = window.innerWidth <= 768 ? 82 : 112;
        targetPosition = pointerStart.startTarget - deltaX / pixelsPerStep;
        currentPosition = targetPosition;
        updateSelectedFromTarget(false);
        renderWheelPositions();
    });

    carousel.addEventListener("pointerup", (event) => {
        if (!pointerStart || pointerStart.id !== event.pointerId) return;
        const wasDragging = pointerStart.dragging;
        const velocity = pointerStart.velocity;
        pointerStart = null;
        if (!wasDragging) return;
        suppressClickUntil = Date.now() + 260;
        const pixelsPerStep = window.innerWidth <= 768 ? 82 : 112;
        const momentumSteps = Math.max(-8, Math.min(8, -velocity * 260 / pixelsPerStep));
        targetPosition = Math.round(targetPosition + momentumSteps);
        updateSelectedFromTarget(false);
        startWheelAnimation();
    });

    carousel.addEventListener("pointercancel", () => {
        if (!pointerStart) return;
        pointerStart = null;
        targetPosition = Math.round(targetPosition);
        updateSelectedFromTarget(false);
        startWheelAnimation();
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(renderWheelPositions, 100);
    }, { passive: true });

    window.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" || sceneFrame || dialog.open) return;
        sceneFrame = window.requestAnimationFrame(() => {
            const x = ((event.clientX / window.innerWidth) - 0.5) * 22;
            const y = ((event.clientY / window.innerHeight) - 0.5) * 16;
            root.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
            root.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
            sceneFrame = 0;
        });
    }, { passive: true });

    renderCarousel(subscriptionActivity.id);
}());
