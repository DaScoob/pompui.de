import { CULTURE_PROFILES } from "./garden-data.js";

export function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRating(value) {
  return clamp(Math.round(Number(value) || 1), 1, 3);
}

export function sortCrops(crops, sort = { key: "name", direction: "asc" }) {
  const direction = sort.direction === "desc" ? -1 : 1;
  const key = ["name", "rating", "profile"].includes(sort.key) ? sort.key : "name";
  return [...crops].sort((first, second) => {
    let comparison = 0;
    if (key === "rating") comparison = normalizeRating(first.rating) - normalizeRating(second.rating);
    else if (key === "profile") comparison = String(first.growingProfile || "outdoor").localeCompare(String(second.growingProfile || "outdoor"), "de");
    else comparison = String(first.name || "").localeCompare(String(second.name || ""), "de", { sensitivity: "base" });
    if (comparison === 0 && key !== "name") comparison = String(first.name || "").localeCompare(String(second.name || ""), "de", { sensitivity: "base" });
    return comparison * direction;
  });
}

export function calculateBedStatistics(bed, crops, resolution = 100) {
  const bedLengthCm = Math.max(1, Number(bed.length) * 100);
  const bedWidthCm = Math.max(1, Number(bed.width) * 100);
  const bedAreaCm2 = bedLengthCm * bedWidthCm;
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const cropCounts = new Map();
  let plantAreaCm2 = 0;
  let pathAreaCm2 = 0;
  let pathLengthCm = 0;

  const circles = (bed.plantings ?? []).flatMap((planting) => {
    const crop = cropById.get(planting.cropId);
    if (!crop) return [];
    const radius = Math.max(0.5, Number(planting.spacingCm ?? crop.customSpacing ?? crop.maxSpacing ?? crop.spacing) / 2 || 0.5);
    plantAreaCm2 += Math.PI * radius * radius;
    cropCounts.set(crop.id, (cropCounts.get(crop.id) ?? 0) + 1);
    return [{ x: Number(planting.x) / 100 * bedLengthCm, y: Number(planting.y) / 100 * bedWidthCm, radius }];
  });

  const pathCells = (bed.paths ?? []).flatMap((path) => {
    const size = Math.max(1, Number(path.cellSizeCm) || 1);
    pathAreaCm2 += (path.cells ?? []).length * size * size;
    pathLengthCm += (path.cells ?? []).length * size;
    return (path.cells ?? []).map((cell) => ({
      left: Number(path.originX) / 100 * bedLengthCm + Number(cell.column) * size,
      top: Number(path.originY) / 100 * bedWidthCm + Number(cell.row) * size,
      size,
    }));
  });

  const samples = Math.max(20, Math.round(Number(resolution) || 100));
  const isCovered = (x, y) => circles.some((circle) => Math.hypot(x - circle.x, y - circle.y) <= circle.radius)
    || pathCells.some((cell) => x >= cell.left && x <= cell.left + cell.size && y >= cell.top && y <= cell.top + cell.size);
  let occupiedSamples = 0;
  for (let row = 0; row < samples; row += 1) {
    const y = (row + 0.5) / samples * bedWidthCm;
    for (let column = 0; column < samples; column += 1) {
      const x = (column + 0.5) / samples * bedLengthCm;
      if (isCovered(x, y)) occupiedSamples += 1;
    }
  }

  return {
    cropCounts: crops.flatMap((crop) => cropCounts.has(crop.id) ? [{ crop, count: cropCounts.get(crop.id) }] : []),
    pathLengthCm,
    pathAreaM2: pathAreaCm2 / 10000,
    utilizationPercent: ((plantAreaCm2 + pathAreaCm2) / bedAreaCm2) * 100,
    freePercent: (1 - occupiedSamples / (samples * samples)) * 100,
  };
}

export function normalizeCrops(crops) {
  return crops.map((crop) => {
    const legacySpacing = Math.max(1, Number(crop.spacing) || 1);
    const minSpacing = Math.max(1, Number(crop.minSpacing) || Math.max(1, Math.round(legacySpacing * 0.8)));
    const maxSpacing = Math.max(minSpacing, Number(crop.maxSpacing) || legacySpacing);
    const customSpacing = Number(crop.customSpacing) > 0 ? Math.max(1, Number(crop.customSpacing)) : null;
    return { ...crop, spacing: customSpacing ?? maxSpacing, minSpacing, maxSpacing, customSpacing, rating: normalizeRating(crop.rating) };
  });
}

function snapCoordinate(percent, axisLengthCm, gridSizeCm) {
  const positionCm = (clamp(percent) / 100) * axisLengthCm;
  const snappedCm = Math.round(positionCm / gridSizeCm) * gridSizeCm;
  return (clamp(snappedCm, 0, axisLengthCm) / axisLengthCm) * 100;
}

export function snapPositionToGrid(position, bed, gridSizeCm) {
  const lengthCm = Number(bed.length) * 100;
  const widthCm = Number(bed.width) * 100;
  const safeGridSize = Math.max(1, Number(gridSizeCm) || 1);

  if (lengthCm <= 0 || widthCm <= 0) {
    return { x: clamp(position.x), y: clamp(position.y) };
  }

  return {
    x: snapCoordinate(position.x, lengthCm, safeGridSize),
    y: snapCoordinate(position.y, widthCm, safeGridSize),
  };
}

export function getGroupMemberIds(group, type) {
  return (group?.members ?? []).filter((member) => member.type === type).map((member) => member.id);
}

export function normalizePaths(paths, bed) {
  const lengthCm = Math.max(1, Number(bed.length) * 100);
  const widthCm = Math.max(1, Number(bed.width) * 100);
  return (paths ?? []).flatMap((path) => {
    const cellSizeCm = clamp(Number(path.cellSizeCm) || Number(bed.gridSizeCm) || 20, 5, 100);
    const maxColumns = Math.max(1, Math.floor(lengthCm / cellSizeCm));
    const maxRows = Math.max(1, Math.floor(widthCm / cellSizeCm));
    const cells = [...new Map((path.cells ?? []).map((cell) => {
      const column = clamp(Math.floor(Number(cell.column) || 0), 0, maxColumns - 1);
      const row = clamp(Math.floor(Number(cell.row) || 0), 0, maxRows - 1);
      return [`${column}:${row}`, { column, row }];
    })).values()];
    if (!cells.length) return [];
    return [{
      id: path.id || createId("weg"),
      cellSizeCm,
      originX: clamp(Number(path.originX) || 0),
      originY: clamp(Number(path.originY) || 0),
      cells,
    }];
  });
}

export function getPathBounds(path, bed) {
  const lengthCm = Math.max(1, Number(bed.length) * 100);
  const widthCm = Math.max(1, Number(bed.width) * 100);
  const cellWidth = (Number(path.cellSizeCm) / lengthCm) * 100;
  const cellHeight = (Number(path.cellSizeCm) / widthCm) * 100;
  const left = clamp(Number(path.originX) + Math.min(...path.cells.map((cell) => cell.column)) * cellWidth);
  const top = clamp(Number(path.originY) + Math.min(...path.cells.map((cell) => cell.row)) * cellHeight);
  const right = clamp(Number(path.originX) + (Math.max(...path.cells.map((cell) => cell.column)) + 1) * cellWidth);
  const bottom = clamp(Number(path.originY) + (Math.max(...path.cells.map((cell) => cell.row)) + 1) * cellHeight);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function splitPathCells(cells, cellSizeCm, bed, idFactory = createId) {
  const remaining = new Map(cells.map((cell) => [`${cell.column}:${cell.row}`, { column: cell.column, row: cell.row }]));
  const lengthCm = Math.max(1, Number(bed.length) * 100);
  const widthCm = Math.max(1, Number(bed.width) * 100);
  const paths = [];

  while (remaining.size) {
    const firstKey = remaining.keys().next().value;
    const queue = [remaining.get(firstKey)];
    remaining.delete(firstKey);
    const component = [];
    while (queue.length) {
      const cell = queue.shift();
      component.push(cell);
      for (const [column, row] of [[cell.column - 1, cell.row], [cell.column + 1, cell.row], [cell.column, cell.row - 1], [cell.column, cell.row + 1]]) {
        const key = `${column}:${row}`;
        if (!remaining.has(key)) continue;
        queue.push(remaining.get(key));
        remaining.delete(key);
      }
    }
    const minColumn = Math.min(...component.map((cell) => cell.column));
    const minRow = Math.min(...component.map((cell) => cell.row));
    paths.push({
      id: idFactory("weg"),
      cellSizeCm,
      originX: ((minColumn * cellSizeCm) / lengthCm) * 100,
      originY: ((minRow * cellSizeCm) / widthCm) * 100,
      cells: component.map((cell) => ({ column: cell.column - minColumn, row: cell.row - minRow })),
    });
  }

  return paths;
}

export function normalizeGroups(groups, plantings, paths = [], fallbackGridSize = 20) {
  const available = {
    planting: new Set(plantings.map((planting) => planting.id)),
    path: new Set(paths.map((path) => path.id)),
  };
  const assignedItems = new Set();

  return (groups ?? []).flatMap((group) => {
    const legacyMembers = [
      ...(group.plantingIds ?? []).map((id) => ({ type: "planting", id })),
      ...(group.pathIds ?? []).map((id) => ({ type: "path", id })),
    ];
    const members = [];
    for (const member of group.members ?? legacyMembers) {
      if (!available[member.type]?.has(member.id)) continue;
      const key = `${member.type}:${member.id}`;
      if (assignedItems.has(key) || members.some((item) => item.type === member.type && item.id === member.id)) continue;
      members.push({ type: member.type, id: member.id });
    }
    if (members.length < 2) return [];
    members.forEach((member) => assignedItems.add(`${member.type}:${member.id}`));

    const anchors = [
      ...plantings.filter((planting) => members.some((member) => member.type === "planting" && member.id === planting.id)).map((item) => ({ x: Number(item.x), y: Number(item.y) })),
      ...paths.filter((path) => members.some((member) => member.type === "path" && member.id === path.id)).map((item) => ({ x: Number(item.originX), y: Number(item.originY) })),
    ];
    return [{
      id: group.id || createId("gruppe"),
      members,
      originX: Number.isFinite(Number(group.originX)) ? clamp(Number(group.originX)) : Math.min(...anchors.map((item) => item.x)),
      originY: Number.isFinite(Number(group.originY)) ? clamp(Number(group.originY)) : Math.min(...anchors.map((item) => item.y)),
      gridSizeCm: clamp(Number(group.gridSizeCm) || fallbackGridSize, 5, 100),
    }];
  });
}

export function snapPositionToGroupGrid(position, group, bed, gridSizeCm = group.gridSizeCm) {
  const lengthCm = Number(bed.length) * 100;
  const widthCm = Number(bed.width) * 100;
  const safeGridSize = Math.max(1, Number(gridSizeCm) || 1);
  if (lengthCm <= 0 || widthCm <= 0) return { x: clamp(position.x), y: clamp(position.y) };

  const localXcm = ((Number(position.x) - Number(group.originX)) / 100) * lengthCm;
  const localYcm = ((Number(position.y) - Number(group.originY)) / 100) * widthCm;
  return {
    x: clamp(Number(group.originX) + ((Math.round(localXcm / safeGridSize) * safeGridSize) / lengthCm) * 100),
    y: clamp(Number(group.originY) + ((Math.round(localYcm / safeGridSize) * safeGridSize) / widthCm) * 100),
  };
}

export function updateGridConfiguration(bed, showGrid, gridSizeCm, groupId = null) {
  if (!showGrid) return { ...bed, showGrid: false };
  if (groupId) return {
    ...bed,
    showGrid: true,
    groups: (bed.groups ?? []).map((group) => group.id === groupId ? { ...group, gridSizeCm } : group),
  };
  return { ...bed, showGrid: true, gridSizeCm };
}

export function getGroupBounds(group, plantings, paths, crops, bed, paddingCm = 0) {
  const plantingIds = new Set(getGroupMemberIds(group, "planting"));
  const pathIds = new Set(getGroupMemberIds(group, "path"));
  const members = plantings.filter((planting) => plantingIds.has(planting.id));
  const memberPaths = paths.filter((path) => pathIds.has(path.id));
  if (!members.length && !memberPaths.length) return null;
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const lengthCm = Math.max(1, Number(bed.length) * 100);
  const widthCm = Math.max(1, Number(bed.width) * 100);
  const extents = members.map((member) => {
    const radiusCm = Math.max(0.5, Number(cropById.get(member.cropId)?.spacing) / 2 || 0.5) + paddingCm;
    return {
      left: Number(member.x) - (radiusCm / lengthCm) * 100,
      right: Number(member.x) + (radiusCm / lengthCm) * 100,
      top: Number(member.y) - (radiusCm / widthCm) * 100,
      bottom: Number(member.y) + (radiusCm / widthCm) * 100,
    };
  });
  for (const path of memberPaths) {
    const bounds = getPathBounds(path, bed);
    const paddingX = (paddingCm / lengthCm) * 100;
    const paddingY = (paddingCm / widthCm) * 100;
    extents.push({ left: bounds.left - paddingX, right: bounds.right + paddingX, top: bounds.top - paddingY, bottom: bounds.bottom + paddingY });
  }
  const left = clamp(Math.min(...extents.map((extent) => extent.left)));
  const top = clamp(Math.min(...extents.map((extent) => extent.top)));
  const right = clamp(Math.max(...extents.map((extent) => extent.right)));
  const bottom = clamp(Math.max(...extents.map((extent) => extent.bottom)));
  return { left, top, right, bottom, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function getSpacingOverlapIds(plantings, crops, bed, movingIds = []) {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const moving = new Set(movingIds);
  const overlapIds = new Set();
  const lengthCm = Math.max(1, Number(bed.length) * 100);
  const widthCm = Math.max(1, Number(bed.width) * 100);

  for (let firstIndex = 0; firstIndex < plantings.length; firstIndex += 1) {
    const first = plantings[firstIndex];
    const firstMoves = moving.has(first.id);
    const firstCrop = cropById.get(first.cropId);
    const firstRadius = Math.max(0.5, Number(first.spacingCm ?? firstCrop?.maxSpacing ?? firstCrop?.spacing) / 2 || 0.5);

    for (let secondIndex = firstIndex + 1; secondIndex < plantings.length; secondIndex += 1) {
      const second = plantings[secondIndex];
      const secondMoves = moving.has(second.id);
      if (moving.size && firstMoves === secondMoves) continue;

      const secondCrop = cropById.get(second.cropId);
      const secondRadius = Math.max(0.5, Number(second.spacingCm ?? secondCrop?.maxSpacing ?? secondCrop?.spacing) / 2 || 0.5);
      const deltaX = ((Number(first.x) - Number(second.x)) / 100) * lengthCm;
      const deltaY = ((Number(first.y) - Number(second.y)) / 100) * widthCm;
      if (Math.hypot(deltaX, deltaY) < firstRadius + secondRadius) {
        overlapIds.add(first.id);
        overlapIds.add(second.id);
      }
    }
  }

  return [...overlapIds];
}

export function monthRange(start, end) {
  if (!start || !end) return [];
  if (start <= end) return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [
    ...Array.from({ length: 13 - start }, (_, index) => start + index),
    ...Array.from({ length: end }, (_, index) => index + 1),
  ];
}

export function filterCalendarCrops(crops, beds, filter, currentMonth, bedId = "all") {
  if (filter === "sow") {
    return crops.filter((crop) => monthRange(crop.sowStart, crop.sowEnd).includes(currentMonth));
  }

  if (filter !== "planted") return crops;

  const relevantBeds = bedId === "all" ? beds : beds.filter((bed) => bed.id === bedId);
  const plantedCropIds = new Set(
    relevantBeds.flatMap((bed) => (bed.plantings ?? []).map((planting) => planting.cropId)),
  );

  return crops.filter((crop) => plantedCropIds.has(crop.id));
}

export function normalizeCultureName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

export function findCultureProfile(value) {
  const normalizedName = normalizeCultureName(value.trim());
  if (!normalizedName) return null;

  return CULTURE_PROFILES.find((profile) =>
    [profile.name, ...profile.aliases].some(
      (candidate) => normalizeCultureName(candidate) === normalizedName,
    ),
  ) ?? null;
}

export function normalizeBeds(beds, idFactory = createId, defaults = {}) {
  return beds.map((bed) => {
    const plantings = [];

    for (const planting of bed.plantings ?? []) {
      const isPositioned = Number.isFinite(Number(planting.x)) && Number.isFinite(Number(planting.y));
      const count = isPositioned ? 1 : Math.max(1, Number(planting.count) || 1);

      for (let index = 0; index < count; index += 1) {
        const positionIndex = plantings.length;
        plantings.push({
          id: index === 0 && planting.id ? planting.id : idFactory("pflanze"),
          cropId: planting.cropId,
          date: planting.date || new Date().toISOString().slice(0, 10),
          ...(Number(planting.spacingCm) > 0 ? { spacingCm: Number(planting.spacingCm) } : {}),
          x: isPositioned ? clamp(Number(planting.x)) : 14 + (positionIndex % 6) * 14,
          y: isPositioned ? clamp(Number(planting.y)) : 18 + (Math.floor(positionIndex / 6) % 4) * 21,
        });
      }
    }

    const gridSizeCm = clamp(Number(bed.gridSizeCm) || Number(defaults.gridSizeCm) || 20, 5, 100);
    const paths = normalizePaths(bed.paths, { ...bed, gridSizeCm });
    return {
      ...bed,
      showSpacing: bed.showSpacing ?? defaults.showSpacing ?? true,
      showGrid: bed.showGrid ?? defaults.showGrid ?? false,
      gridSizeCm,
      plantings,
      paths,
      groups: normalizeGroups(bed.groups, plantings, paths, gridSizeCm),
    };
  });
}

export function cloneBed(bed, idFactory = createId, options = {}) {
  const includeSettings = options.includeSettings !== false;
  const includeContents = options.includeContents !== false;
  const sourcePlantings = includeContents ? (bed.plantings ?? []) : [];
  const sourcePaths = includeContents ? (bed.paths ?? []) : [];
  const sourceGroups = includeContents ? (bed.groups ?? []) : [];
  const plantingIdMap = new Map(sourcePlantings.map((planting) => [planting.id, idFactory("pflanze")]));
  const pathIdMap = new Map(sourcePaths.map((path) => [path.id, idFactory("weg")]));
  return {
    ...bed,
    id: idFactory("beet"),
    name: `${bed.name} – Kopie`,
    showSpacing: includeSettings ? bed.showSpacing : true,
    showGrid: includeSettings ? bed.showGrid : false,
    gridSizeCm: includeSettings ? bed.gridSizeCm : 20,
    plantings: sourcePlantings.map((planting) => ({ ...planting, id: plantingIdMap.get(planting.id) })),
    paths: sourcePaths.map((path) => ({ ...path, id: pathIdMap.get(path.id), cells: path.cells.map((cell) => ({ ...cell })) })),
    groups: sourceGroups.map((group) => ({
      ...group,
      id: idFactory("gruppe"),
      members: group.members.flatMap((member) => {
        const id = member.type === "planting" ? plantingIdMap.get(member.id) : pathIdMap.get(member.id);
        return id ? [{ ...member, id }] : [];
      }),
    })),
  };
}

export function autoPlantPositions({ bed, spacingCm, layout, frame }) {
  const bedLengthCm = Math.max(1, Number(bed.length) * 100);
  const bedWidthCm = Math.max(1, Number(bed.width) * 100);
  const spacing = Math.max(1, Number(spacingCm) || 1);
  const radius = spacing / 2;
  const bounds = {
    left: Math.min(frame.start.x, frame.current.x) / 100 * bedLengthCm,
    right: Math.max(frame.start.x, frame.current.x) / 100 * bedLengthCm,
    top: Math.min(frame.start.y, frame.current.y) / 100 * bedWidthCm,
    bottom: Math.max(frame.start.y, frame.current.y) / 100 * bedWidthCm,
  };
  const accepted = [];
  const rowStep = layout === "hex" ? spacing * Math.sqrt(3) / 2 : spacing;
  let row = 0;
  for (let y = bounds.top + radius; y <= bounds.bottom - radius + 0.0001; y += rowStep, row += 1) {
    const offset = layout === "hex" && row % 2 ? spacing / 2 : 0;
    for (let x = bounds.left + radius + offset; x <= bounds.right - radius + 0.0001; x += spacing) {
      const overlapsNewPlant = accepted.some((item) => Math.hypot(x - item.x, y - item.y) < radius + item.radius - 0.0001);
      if (!overlapsNewPlant) accepted.push({ x, y, radius });
    }
  }
  return accepted.map((item) => ({ x: item.x / bedLengthCm * 100, y: item.y / bedWidthCm * 100 }));
}
