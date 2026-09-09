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
            id: "snapotter",
            title: "SnapOtter",
            status: "Bereit",
            description: "200+ Werkzeuge für Bilder, Video, Audio, PDFs und Dokumente — auf deinem eigenen Server.",
            meta: "Konvertieren · Komprimieren · KI · AGPL-3.0",
            accent: "#62b6f7",
            accentRgb: "86, 181, 247",
            href: "https://snapotter.pompui.de/",
            action: "Aktivität starten"
        },
        {
            id: "punctum",
            title: "Punctum",
            status: "Bereit",
            description: "Stoppuhr, Timer, Wecker und Pomodoro — präzise Zeit-Instrumente ohne Drift.",
            meta: "Messen · Erinnern · Fokussieren",
            accent: "#e8b3ff",
            accentRgb: "232, 179, 255",
            href: "https://punctum.pompui.de/",
            action: "Aktivität starten"
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
    const clockTime = document.querySelector("[data-clock-time]");

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

    // Live clock in the topbar
    if (clockTime) {
        const renderClock = () => {
            const now = new Date();
            clockTime.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        };
        renderClock();
        setInterval(renderClock, 1000);
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
        const isCompact = window.innerWidth <= 768;
        const minimumStep = isCompact ? 96 : 112;
        const maximumStep = isCompact ? 128 : 192;
        const step = Math.max(minimumStep, Math.min(window.innerHeight * 0.17, maximumStep));

        tiles.forEach((tile, index) => {
            const offset = circularOffset(index);
            const distance = Math.abs(offset);
            const isActive = index === activeIndex;

            tile.style.setProperty("--offset", String(offset));
            tile.style.setProperty("--tile-shift", `${(offset * step).toFixed(2)}px`);
            tile.style.setProperty("--tile-opacity", String(Math.max(0.46, 1 - distance * 0.2)));
            tile.style.setProperty("--tile-scale", String(1 - distance * 0.12));
            tile.style.setProperty("--tile-blur", distance > 1 ? "1px" : "0px");
            // Dye each tile with its activity accent so icon and glow match
            tile.style.setProperty("--tile-accent", activities[index].accent);
            tile.classList.toggle("is-active", isActive);
            tile.setAttribute("aria-current", String(isActive));
            tile.setAttribute("aria-label", activities[index].title + (isActive ? " — erneut aktivieren zum Starten" : " auswählen"));
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
                // Selected tile → launch the app; others → bring to center
                if (index === activeIndex) {
                    const activity = activities[index];
                    if (activity.href) window.open(activity.href, "_self");
                    return;
                }
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
        // Capture only on the carousel, NOT via setPointerCapture — capturing
        // here retargets the later click event away from the tile, breaking
        // tile activation. Capture is applied lazily on first drag move.
    });

    carousel.addEventListener("pointermove", (event) => {
        if (!pointerStart || pointerStart.id !== event.pointerId) return;
        if (pointerStart.dragging) return;
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        // Once the pointer moves like a drag, capture so leaving the tile
        // still ends the gesture on the carousel.
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            pointerStart.dragging = true;
            try { carousel.setPointerCapture(event.pointerId); } catch { /* not supported */ }
        }
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

    let resizeTimer;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => updateTiles(false), 100);
    }, { passive: true });

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
