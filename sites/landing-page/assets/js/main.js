(function () {
    "use strict";

    const activities = [
        {
            id: "garden",
            title: "Gartenjournal",
            status: "Bereit",
            description: "Beete gestalten, Kulturen verwalten und das Gartenjahr im Blick behalten.",
            meta: "Planen · Pflegen · Ernten",
            accent: "#9bea75",
            accentRgb: "155, 234, 117",
            href: "https://gj.pompui.de/",
            action: "Aktivität starten"
        },
        {
            id: "obacht",
            title: "Obacht",
            status: "In Entwicklung",
            description: "Kontaktlose Sturz- und Bewegungserkennung auf Basis von WiFi-Sensing.",
            meta: "Open Source · Powered by RuView",
            accent: "#ff9365",
            accentRgb: "255, 147, 101",
            href: "",
            action: "Projekt in Entwicklung"
        },
        {
            id: "funkblick",
            title: "Funkblick",
            status: "Experiment",
            description: "WiFi-Signale, Bewegung und Raumerfassung sichtbar und verständlich machen.",
            meta: "Sensing · Analyse · Visualisierung",
            accent: "#56d9e8",
            accentRgb: "86, 217, 232",
            href: "",
            action: "Experiment in Vorbereitung"
        },
        {
            id: "vorrat",
            title: "Vorrat",
            status: "Konzept",
            description: "Ernten, Saatgut und eingelagerte Vorräte übersichtlich organisieren.",
            meta: "Sammeln · Lagern · Wiederfinden",
            accent: "#f6c85f",
            accentRgb: "246, 200, 95",
            href: "",
            action: "Konzept in Vorbereitung"
        },
        {
            id: "werkbank",
            title: "Werkbank",
            status: "Labor",
            description: "Ein Platz für kleine Open-Source-Werkzeuge und neue Versuchsprojekte.",
            meta: "Bauen · Erproben · Teilen",
            accent: "#bd8cff",
            accentRgb: "189, 140, 255",
            href: "",
            action: "Labor in Vorbereitung"
        }
    ];

    const root = document.documentElement;
    const page = document.body;
    const carousel = document.querySelector("[data-carousel]");
    const tiles = Array.from(document.querySelectorAll("[data-activity-id]"));
    const details = document.querySelector("[data-activity-details]");
    const count = document.querySelector("[data-activity-count]");
    const status = document.querySelector("[data-activity-status]");
    const title = document.querySelector("[data-activity-title]");
    const description = document.querySelector("[data-activity-description]");
    const meta = document.querySelector("[data-activity-meta]");
    const action = document.querySelector("[data-activity-action]");
    const flash = document.querySelector("[data-selection-flash]");
    const year = document.querySelector("[data-current-year]");

    let activeIndex = 0;
    let changeToken = 0;
    let wheelTotal = 0;
    let wheelLocked = false;
    let wheelResetTimer;
    let pointerStart = null;
    let sceneFrame = 0;

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }

    if (!carousel || tiles.length !== activities.length) {
        return;
    }

    const normalizeIndex = (index) => {
        const total = activities.length;
        return ((index % total) + total) % total;
    };

    const circularOffset = (index) => {
        const total = activities.length;
        const midpoint = Math.floor(total / 2);
        let offset = index - activeIndex;

        if (offset > midpoint) {
            offset -= total;
        } else if (offset < -midpoint) {
            offset += total;
        }

        return offset;
    };

    const renderAction = (activity) => {
        action.replaceChildren();

        if (!activity.href) {
            const unavailable = document.createElement("span");
            unavailable.className = "launch-button--disabled";
            unavailable.textContent = activity.action;
            unavailable.setAttribute("aria-disabled", "true");
            action.append(unavailable);
            return;
        }

        const link = document.createElement("a");
        const label = document.createElement("span");
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        link.className = "launch-button";
        link.href = activity.href;
        label.textContent = activity.action;
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        path.setAttribute("d", "M5 12h14m-6-6 6 6-6 6");
        icon.append(path);
        link.append(label, icon);
        action.append(link);
    };

    const updateTiles = (shouldFocus) => {
        tiles.forEach((tile, index) => {
            const offset = circularOffset(index);
            const distance = Math.abs(offset);
            const isActive = index === activeIndex;

            tile.style.setProperty("--offset", String(offset));
            tile.style.setProperty("--tile-opacity", String(Math.max(0.46, 1 - distance * 0.2)));
            tile.style.setProperty("--tile-scale", String(1 - distance * 0.12));
            tile.style.setProperty("--tile-blur", distance > 1 ? "1px" : "0px");
            tile.classList.toggle("is-active", isActive);
            tile.setAttribute("aria-current", String(isActive));
            tile.tabIndex = isActive ? 0 : -1;
        });

        if (shouldFocus) {
            tiles[activeIndex].focus({ preventScroll: true });
        }
    };

    const updateDetails = (activity, token) => {
        window.setTimeout(() => {
            if (token !== changeToken) {
                return;
            }

            count.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(activities.length).padStart(2, "0")}`;
            status.textContent = activity.status;
            title.textContent = activity.title;
            description.textContent = activity.description;
            meta.textContent = activity.meta;
            renderAction(activity);
            details.classList.remove("is-changing");
        }, 150);
    };

    const pulseScene = () => {
        if (!flash) {
            return;
        }

        flash.classList.remove("is-active");
        void flash.offsetWidth;
        flash.classList.add("is-active");
    };

    const selectActivity = (nextIndex, options = {}) => {
        const normalized = normalizeIndex(nextIndex);
        const activity = activities[normalized];
        const hasChanged = normalized !== activeIndex;

        activeIndex = normalized;
        changeToken += 1;

        if (hasChanged) {
            details.classList.add("is-changing");
        }

        root.style.setProperty("--accent", activity.accent);
        root.style.setProperty("--accent-rgb", activity.accentRgb);
        page.dataset.theme = activity.id;
        updateTiles(Boolean(options.focus));
        updateDetails(activity, changeToken);

        if (hasChanged) {
            pulseScene();
        }
    };

    const move = (direction, shouldFocus = true) => {
        selectActivity(activeIndex + direction, { focus: shouldFocus });
    };

    tiles.forEach((tile, index) => {
        tile.addEventListener("click", () => {
            selectActivity(index, { focus: true });
        });
    });

    document.querySelectorAll("[data-direction]").forEach((control) => {
        control.addEventListener("click", () => {
            move(Number(control.dataset.direction), true);
        });
    });

    carousel.addEventListener("keydown", (event) => {
        const keyActions = {
            ArrowLeft: () => move(-1, true),
            ArrowRight: () => move(1, true),
            Home: () => selectActivity(0, { focus: true }),
            End: () => selectActivity(activities.length - 1, { focus: true })
        };
        const keyAction = keyActions[event.key];

        if (keyAction) {
            event.preventDefault();
            keyAction();
        }
    });

    window.addEventListener("wheel", (event) => {
        event.preventDefault();

        if (wheelLocked) {
            return;
        }

        const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerWidth : 1;
        wheelTotal += rawDelta * unit;

        window.clearTimeout(wheelResetTimer);
        wheelResetTimer = window.setTimeout(() => {
            wheelTotal = 0;
        }, 180);

        if (Math.abs(wheelTotal) < 42) {
            return;
        }

        move(wheelTotal > 0 ? 1 : -1, false);
        wheelTotal = 0;
        wheelLocked = true;
        window.setTimeout(() => {
            wheelLocked = false;
        }, 360);
    }, { passive: false });

    carousel.addEventListener("pointerdown", (event) => {
        pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        carousel.setPointerCapture(event.pointerId);
    });

    carousel.addEventListener("pointerup", (event) => {
        if (!pointerStart || pointerStart.id !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - pointerStart.x;
        const deltaY = event.clientY - pointerStart.y;
        pointerStart = null;

        if (Math.abs(deltaX) > 34 && Math.abs(deltaX) > Math.abs(deltaY)) {
            move(deltaX < 0 ? 1 : -1, false);
        }
    });

    carousel.addEventListener("pointercancel", () => {
        pointerStart = null;
    });

    window.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" || sceneFrame) {
            return;
        }

        sceneFrame = window.requestAnimationFrame(() => {
            const x = ((event.clientX / window.innerWidth) - 0.5) * 22;
            const y = ((event.clientY / window.innerHeight) - 0.5) * 16;
            root.style.setProperty("--scene-x", `${x.toFixed(2)}px`);
            root.style.setProperty("--scene-y", `${y.toFixed(2)}px`);
            sceneFrame = 0;
        });
    }, { passive: true });

    updateTiles(false);
}());
