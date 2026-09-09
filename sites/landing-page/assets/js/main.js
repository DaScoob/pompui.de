(function () {
    "use strict";

    const rail = document.querySelector("[data-activity-rail]");
    const year = document.querySelector("[data-current-year]");
    const controls = document.querySelectorAll("[data-scroll]");

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }

    if (!rail) {
        return;
    }

    const getScrollDistance = () => {
        const card = rail.querySelector("[data-activity-card]");
        const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;

        return card ? card.getBoundingClientRect().width + gap : rail.clientWidth * 0.85;
    };

    const scrollRail = (direction) => {
        rail.scrollBy({
            left: getScrollDistance() * direction,
            behavior: "smooth"
        });
    };

    controls.forEach((control) => {
        control.addEventListener("click", () => {
            scrollRail(control.dataset.scroll === "next" ? 1 : -1);
        });
    });

    rail.addEventListener("keydown", (event) => {
        const actions = {
            ArrowLeft: () => scrollRail(-1),
            ArrowRight: () => scrollRail(1),
            Home: () => rail.scrollTo({ left: 0, behavior: "smooth" }),
            End: () => rail.scrollTo({ left: rail.scrollWidth, behavior: "smooth" })
        };

        const action = actions[event.key];

        if (action) {
            event.preventDefault();
            action();
        }
    });

    rail.addEventListener("wheel", (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || rail.scrollWidth <= rail.clientWidth) {
            return;
        }

        event.preventDefault();
        rail.scrollLeft += event.deltaY;
    }, { passive: false });
}());
