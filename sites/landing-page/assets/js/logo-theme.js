(function () {
    "use strict";

    const logoObjects = Array.from(document.querySelectorAll("[data-pompui-logo]"));
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    let activeAccent = "#9BEA75";

    const normalizeHex = (value) => {
        if (!value) return null;
        let hex = value.trim();
        if (/^#[0-9a-f]{3}$/i.test(hex)) {
            hex = `#${[...hex.slice(1)].map((character) => character + character).join("")}`;
        }
        return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : null;
    };

    const hexToRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = (value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    const gamma = (value) => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

    const rgbToOklch = ([red, green, blue]) => {
        [red, green, blue] = [red, green, blue].map(linear);
        const ll = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
        const mm = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
        const ss = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
        const lightness = 0.2104542553 * ll + 0.793617785 * mm - 0.0040720468 * ss;
        const aa = 1.9779984951 * ll - 2.428592205 * mm + 0.4505937099 * ss;
        const bb = 0.0259040371 * ll + 0.7827717662 * mm - 0.808675766 * ss;
        return [lightness, Math.hypot(aa, bb), (Math.atan2(bb, aa) * 180 / Math.PI + 360) % 360];
    };

    const oklchToLinear = (lightness, chroma, angle) => {
        const radians = angle * Math.PI / 180;
        const aa = chroma * Math.cos(radians);
        const bb = chroma * Math.sin(radians);
        const ll = (lightness + 0.3963377774 * aa + 0.2158037573 * bb) ** 3;
        const mm = (lightness - 0.1055613458 * aa - 0.0638541728 * bb) ** 3;
        const ss = (lightness - 0.0894841775 * aa - 1.291485548 * bb) ** 3;
        return [
            4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
            -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
            -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss
        ];
    };

    const mappedRgb = (lightness, chroma, angle) => {
        let low = 0;
        let high = chroma;
        let rgb = oklchToLinear(lightness, high, angle);

        if (!rgb.every((value) => value >= 0 && value <= 1)) {
            for (let index = 0; index < 24; index += 1) {
                const middle = (low + high) / 2;
                const candidate = oklchToLinear(lightness, middle, angle);
                if (candidate.every((value) => value >= 0 && value <= 1)) {
                    low = middle;
                } else {
                    high = middle;
                }
            }
            rgb = oklchToLinear(lightness, low, angle);
        }

        return rgb.map((value) => Math.round(clamp(gamma(value), 0, 1) * 255));
    };

    const rgbHex = (rgb) => `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

    const setNodeColor = (node, color) => {
        if (node.hasAttribute("fill") && node.getAttribute("fill") !== "none") {
            node.setAttribute("fill", color);
        }
        if (node.hasAttribute("stroke") && node.getAttribute("stroke") !== "none") {
            node.setAttribute("stroke", color);
        }
    };

    const applyAccentToSvg = (svg, mode, accent) => {
        const [, targetChroma, targetHue] = rgbToOklch(hexToRgb(accent));
        const targetStrength = clamp(targetChroma / 0.22, 0, 1.45);

        if (mode === "dark") {
            svg.querySelectorAll(".pompui-glow, .pompui-theme-color").forEach((node) => {
                const source = normalizeHex(node.dataset.glowSource);
                if (!source) return;
                const [lightness, chroma] = rgbToOklch(hexToRgb(source));
                setNodeColor(node, rgbHex(mappedRgb(lightness, chroma * 1.4 * targetStrength, targetHue)));
            });
            return;
        }

        svg.querySelectorAll(".pompui-oklch-adaptive").forEach((node) => {
            const source = normalizeHex(node.dataset.oklchSource) || normalizeHex(node.getAttribute("fill"));
            const sourceOklch = source ? rgbToOklch(hexToRgb(source)) : [0.7, 0.1, targetHue];
            const lightness = Number(node.dataset.oklchL) || sourceOklch[0];
            const chroma = Number(node.dataset.oklchC) || sourceOklch[1];
            setNodeColor(node, rgbHex(mappedRgb(lightness, chroma * 1.15 * targetStrength, targetHue)));
        });
    };

    const applyToObject = (logoObject) => {
        const svg = logoObject.contentDocument && logoObject.contentDocument.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") return;
        applyAccentToSvg(svg, logoObject.dataset.logoMode, activeAccent);

        if (logoObject.hasAttribute("data-pompui-wordmark")) {
            const foreground = normalizeHex(getComputedStyle(document.documentElement).getPropertyValue("--text"));
            if (foreground) {
                svg.querySelectorAll("#face stop").forEach((stop) => {
                    stop.setAttribute("stop-color", foreground);
                });
            }
        }
    };

    logoObjects.forEach((logoObject) => {
        logoObject.addEventListener("load", () => applyToObject(logoObject));
        applyToObject(logoObject);
    });

    window.addEventListener("pompui:color-mode-change", () => {
        logoObjects.forEach(applyToObject);
    });

    window.PompuiLogo = {
        setAccent: (accent) => {
            const normalized = normalizeHex(accent);
            if (!normalized) return;
            activeAccent = normalized;
            logoObjects.forEach(applyToObject);
        }
    };
}());
