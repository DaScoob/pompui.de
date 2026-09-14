(function (globalScope) {
    "use strict";

    const TAU = Math.PI * 2;
    const DEFAULT_WHEEL_DEPTH = 52;
    const COMPACT_WHEEL_DEPTH = 36;

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function normalizeIndex(index, total) {
        return total ? ((index % total) + total) % total : 0;
    }

    function nearestOffset(index, position, total) {
        if (!total) return 0;
        return ((index - position + total / 2) % total + total) % total - total / 2;
    }

    function smoothstep(value) {
        const normalized = clamp(value, 0, 1);
        return normalized * normalized * (3 - 2 * normalized);
    }

    function scaleAtAngle(angle, cosTilt, cameraRatio) {
        return (cameraRatio - cosTilt) / (cameraRatio - Math.cos(angle) * cosTilt);
    }

    function projectedEdgeAtAngle(angle, radius, tileWidth, cosTilt, cameraRatio) {
        const scale = scaleAtAngle(angle, cosTilt, cameraRatio);
        return Math.abs(radius * Math.sin(angle) * scale) + tileWidth * scale / 2;
    }

    function maximumProjectedEdge(radius, tileWidth, cosTilt, cameraRatio) {
        let maximum = 0;
        for (let sample = 0; sample <= 48; sample += 1) {
            maximum = Math.max(
                maximum,
                projectedEdgeAtAngle(sample / 48 * Math.PI, radius, tileWidth, cosTilt, cameraRatio)
            );
        }
        return maximum;
    }

    function minimumRadiusForChord(total, centerDistance) {
        if (total <= 1) return 0;
        return centerDistance / (2 * Math.sin(Math.PI / total));
    }

    function candidateIndexes(total, position, metrics) {
        const minimumScale = (metrics.cameraRatio - metrics.cosTilt) / (metrics.cameraRatio + metrics.cosTilt);
        const visibilityRatio = (metrics.fadeEnd + metrics.tileWidth / 2) / (metrics.radius * minimumScale);

        if (total <= 2 || visibilityRatio >= 1) {
            return Array.from({ length: total }, (_, logicalIndex) => logicalIndex);
        }

        const visibleHalfAngle = Math.asin(clamp(visibilityRatio, 0, 1));
        const bandRadius = Math.min(
            Math.ceil(total / 2),
            Math.ceil(visibleHalfAngle / metrics.angleStep) + 3
        );
        const frontCenter = Math.round(position);
        const rearCenter = Math.round(position + total / 2);
        const indexes = new Set();

        [frontCenter, rearCenter].forEach((center) => {
            for (let offset = -bandRadius; offset <= bandRadius; offset += 1) {
                indexes.add(normalizeIndex(center + offset, total));
            }
        });

        return [...indexes];
    }

    function resolveMetrics(options) {
        const total = Math.max(1, Math.floor(options.total || 1));
        const width = Math.max(1, Number(options.width) || 1);
        const height = Math.max(1, Number(options.height) || 1);
        const compact = Boolean(options.compact);
        const tileWidth = Math.max(1, Number(options.tileWidth) || (compact ? 86 : 152));
        const cameraRatio = 4;
        const minimumCenterDistance = Math.max(tileWidth * 1.83, compact ? 159 : 264);
        const minimumRadius = Math.max(minimumCenterDistance * 1.25, Math.min(height * 0.92, compact ? 150 : 230));
        const arcRadius = total * minimumCenterDistance / TAU;
        const chordRadius = minimumRadiusForChord(total, minimumCenterDistance);
        const baseRadius = Math.max(minimumRadius, arcRadius);
        const radius = Math.max(minimumRadius, chordRadius);
        const wheelDepth = Math.max(1, Number(options.wheelDepth) || (compact ? COMPACT_WHEEL_DEPTH : DEFAULT_WHEEL_DEPTH));
        const tilt = Math.asin(clamp(wheelDepth / radius, 0, 1));
        const angleStep = TAU / total;
        const fadeWidth = Math.min(width * 0.1, compact ? 52 : 128);
        const edgePadding = compact ? 8 : Math.min(24, width * 0.02);
        const fadeEnd = Math.max(1, width / 2 - edgePadding);
        const fadeStart = Math.max(0, fadeEnd - fadeWidth);
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);

        return {
            angleStep,
            baseRadius,
            cameraRatio,
            compact,
            cosTilt,
            fadeEnd,
            fadeStart,
            height,
            minimumCenterDistance,
            minimumRadius,
            radius,
            sinTilt,
            tileWidth,
            tilt,
            total,
            verticalCompensation: Math.max(0, radius - baseRadius) * sinTilt,
            wheelDepth,
            width
        };
    }

    function projectItem(logicalIndex, position, metrics, activeIndex) {
        const logicalOffset = nearestOffset(logicalIndex, position, metrics.total);
        const angle = logicalOffset * metrics.angleStep;
        const circleX = metrics.radius * Math.sin(angle);
        const circleZ = metrics.radius * Math.cos(angle);
        const scale = scaleAtAngle(angle, metrics.cosTilt, metrics.cameraRatio);
        const rotatedY = circleZ * metrics.sinTilt;
        const rotatedZ = circleZ * metrics.cosTilt;
        const x = circleX * scale;
        const y = rotatedY * scale;
        const depth = clamp((Math.cos(angle) + 1) / 2, 0, 1);
        const edge = Math.abs(x) + metrics.tileWidth * scale / 2;
        const edgeProgress = clamp((metrics.fadeEnd - edge) / Math.max(metrics.fadeEnd - metrics.fadeStart, 1), 0, 1);
        const edgeOpacity = smoothstep(edgeProgress);
        const isActive = logicalIndex === activeIndex;
        const state = isActive || edge < metrics.fadeStart ? "visible" : (edge < metrics.fadeEnd ? "fading" : "hidden");
        const depthOpacity = 0.28 + depth * 0.72;

        return {
            logicalIndex,
            logicalOffset,
            angle,
            circleX,
            circleZ,
            rotatedY,
            rotatedZ,
            perspective: metrics.cameraRatio / (metrics.cameraRatio - Math.cos(angle) * metrics.cosTilt),
            scale,
            x,
            y,
            depth,
            edge,
            edgeOpacity: isActive ? 1 : edgeOpacity,
            opacity: isActive ? 1 : edgeOpacity * depthOpacity,
            state,
            zIndex: isActive ? 200 : 20 + Math.round(depth * 80)
        };
    }

    function compassAngle(position, total) {
        return 180 + (Number(position) || 0) * 360 / Math.max(1, total);
    }

    function createWheelLayout(options) {
        const total = Math.max(0, Math.floor(options.total || 0));
        if (!total) {
            return {
                activeIndex: 0,
                angleStep: TAU,
                isVirtualized: false,
                items: [],
                mathematicalAngleStep: TAU,
                projectedCount: 0,
                radius: 0,
                requiresCompass: false,
                verticalCompensation: 0,
                visibleCount: 0,
                wheelDepth: 0
            };
        }

        const position = Number.isFinite(options.position) ? options.position : 0;
        const metrics = resolveMetrics({ ...options, total });
        const activeIndex = normalizeIndex(Math.round(position), total);
        const candidates = candidateIndexes(total, position, metrics);
        const projected = candidates.map((logicalIndex) => projectItem(logicalIndex, position, metrics, activeIndex));
        const reserveIndexes = new Set();

        [-1, 1].forEach((side) => {
            projected
                .filter((item) => item.state === "hidden" && Math.sign(item.x) === side)
                .sort((left, right) => left.edge - right.edge)
                .slice(0, 2)
                .forEach((item) => reserveIndexes.add(item.logicalIndex));
        });

        const items = projected.filter((item) => item.state !== "hidden" || reserveIndexes.has(item.logicalIndex));
        const visibleCount = items.filter((item) => item.state !== "hidden").length;

        return {
            activeIndex,
            angleStep: metrics.angleStep,
            baseRadius: metrics.baseRadius,
            cameraDistance: metrics.radius * metrics.cameraRatio,
            fadeEnd: metrics.fadeEnd,
            fadeStart: metrics.fadeStart,
            isVirtualized: projected.length < total || total > visibleCount,
            items,
            mathematicalAngleStep: metrics.angleStep,
            minimumCenterDistance: metrics.minimumCenterDistance,
            minimumRadius: metrics.minimumRadius,
            positionCount: total,
            projectedCount: projected.length,
            radius: metrics.radius,
            requiresCompass: total > 1 && maximumProjectedEdge(
                metrics.radius,
                metrics.tileWidth,
                metrics.cosTilt,
                metrics.cameraRatio
            ) >= metrics.fadeStart,
            spacing: metrics.minimumCenterDistance,
            tilt: metrics.tilt,
            verticalCompensation: metrics.verticalCompensation,
            visibleCount,
            wheelDepth: metrics.wheelDepth
        };
    }

    const api = {
        COMPACT_WHEEL_DEPTH,
        DEFAULT_WHEEL_DEPTH,
        TAU,
        clamp,
        compassAngle,
        createWheelLayout,
        maximumProjectedEdge,
        minimumRadiusForChord,
        nearestOffset,
        normalizeIndex,
        projectedEdgeAtAngle,
        scaleAtAngle,
        smoothstep
    };

    globalScope.PompuiWheelGeometry = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof globalThis !== "undefined" ? globalThis : window));
