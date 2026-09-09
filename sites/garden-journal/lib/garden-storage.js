import { DEFAULT_CROPS } from "./garden-data.js";
import { normalizeBeds, normalizeCrops } from "./garden-utils.js";

export const STORAGE_KEY = "gemuesegarten-v1";

function normalizeTransparency(value) {
  const transparency = Number(value);
  return Number.isFinite(transparency) ? Math.min(100, Math.max(0, transparency)) : 25;
}

export function createInitialGarden() {
  return { beds: [], crops: DEFAULT_CROPS, activeTab: "beete", spacingTransparency: 25 };
}

export function loadGarden(storage = globalThis.localStorage) {
  if (!storage) return createInitialGarden();

  try {
    const rawGarden = storage.getItem(STORAGE_KEY);
    if (!rawGarden) return createInitialGarden();

    const parsedGarden = JSON.parse(rawGarden);
    return {
      beds: Array.isArray(parsedGarden.beds) ? normalizeBeds(parsedGarden.beds, undefined, {
        showSpacing: parsedGarden.showSpacing !== false,
        showGrid: parsedGarden.showGrid === true,
        gridSizeCm: Math.min(100, Math.max(5, Number(parsedGarden.gridSizeCm) || 20)),
      }) : [],
      crops: Array.isArray(parsedGarden.crops) && parsedGarden.crops.length ? normalizeCrops(parsedGarden.crops) : DEFAULT_CROPS,
      activeTab: "beete",
      spacingTransparency: normalizeTransparency(parsedGarden.spacingTransparency),
    };
  } catch {
    return createInitialGarden();
  }
}

export function saveGarden(storage, garden) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    beds: garden.beds,
    crops: garden.crops,
    spacingTransparency: garden.spacingTransparency,
  }));
}
