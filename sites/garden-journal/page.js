"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MonthSelect } from "./components/month-select.js";
import { ConfirmDialog } from "./components/confirm-dialog.js";
import { StarRating } from "./components/star-rating.js";
import { CULTURE_PROFILES, DEFAULT_CROPS, EMPTY_BED, EMPTY_CROP, MONTHS, MONTHS_LONG } from "./lib/garden-data.js";
import { loadGarden, saveGarden } from "./lib/garden-storage.js";
import { clamp, createId, filterCalendarCrops, findCultureProfile, getGroupBounds, getGroupMemberIds, getPathBounds, getSpacingOverlapIds, monthRange, normalizeBeds, normalizeCrops, normalizeGroups, normalizeRating, snapPositionToGrid, snapPositionToGroupGrid, splitPathCells } from "./lib/garden-utils.js";

const EMPTY_SELECTION = { bedId: null, plantingIds: [], pathIds: [], groupId: null };

export default function GardenApp() {
  const [state, setState] = useState({ beds: [], crops: DEFAULT_CROPS, activeTab: "beete", spacingTransparency: 25 });
  const [ready, setReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [bedDraft, setBedDraft] = useState(EMPTY_BED);
  const [cropDraft, setCropDraft] = useState(EMPTY_CROP);
  const [phaseStatus, setPhaseStatus] = useState({ type: "idle" });
  const [editingCrop, setEditingCrop] = useState(null);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [selectionFrame, setSelectionFrame] = useState(null);
  const [paletteMenu, setPaletteMenu] = useState(null);
  const [undoState, setUndoState] = useState(null);
  const [draggingOutside, setDraggingOutside] = useState(false);
  const [pathDraft, setPathDraft] = useState(null);
  const [cropSearch, setCropSearch] = useState("");
  const [calendarFilter, setCalendarFilter] = useState("all");
  const [calendarBedId, setCalendarBedId] = useState("all");
  const [paletteRatingFilter, setPaletteRatingFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [deleteRequest, setDeleteRequest] = useState(null);
  const importRef = useRef(null);
  const movingPlantRef = useRef(null);
  const movingPathRef = useRef(null);
  const pathFrameRef = useRef(null);
  const selectionFrameRef = useRef(null);
  const paletteClickTimerRef = useRef(null);

  useEffect(() => {
    setState(loadGarden());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveGarden(window.localStorage, state);
  }, [state.beds, state.crops, state.spacingTransparency, ready]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!undoState) return undefined;
    const timeout = window.setTimeout(() => setUndoState(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [undoState]);

  useEffect(() => () => window.clearTimeout(paletteClickTimerRef.current), []);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };

  const plantedCount = state.beds.reduce((sum, bed) => sum + (bed.plantings?.length || 0), 0);
  const plantedCropIds = new Set(state.beds.flatMap((bed) => (bed.plantings || []).map((p) => p.cropId)));
  const currentMonth = new Date().getMonth() + 1;
  const harvestNow = state.crops.filter((crop) => plantedCropIds.has(crop.id) && monthRange(crop.harvestStart, crop.harvestEnd).includes(currentMonth));

  const filteredCrops = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    return q ? state.crops.filter((crop) => `${crop.name} ${crop.note}`.toLowerCase().includes(q)) : state.crops;
  }, [state.crops, cropSearch]);

  const calendarCrops = useMemo(() => {
    return filterCalendarCrops(state.crops, state.beds, calendarFilter, currentMonth, calendarBedId);
  }, [state.crops, state.beds, calendarFilter, calendarBedId, currentMonth]);

  const calendarEmptyMessage = calendarFilter === "sow"
    ? "In diesem Monat sind keine Kulturen zur Aussaat vorgesehen."
    : calendarFilter === "planted" && calendarBedId !== "all"
      ? "In diesem Beet sind noch keine Kulturen vorhanden."
      : calendarFilter === "planted"
        ? "In den Beeten sind noch keine Kulturen vorhanden."
        : "Für diesen Filter sind noch keine Kulturen vorhanden.";

  const paletteCrops = useMemo(() => {
    if (paletteRatingFilter === "all") return state.crops;
    return state.crops.filter((crop) => crop.rating === Number(paletteRatingFilter));
  }, [state.crops, paletteRatingFilter]);

  const addBed = (event) => {
    event.preventDefault();
    if (!bedDraft.name.trim()) return flash("Ein Beetname fehlt.");
    setState((prev) => ({
      ...prev,
      beds: [...prev.beds, { id: createId("beet"), name: bedDraft.name.trim(), width: Number(bedDraft.width), length: Number(bedDraft.length), showSpacing: true, showGrid: false, gridSizeCm: 20, plantings: [], paths: [], groups: [] }],
    }));
    setBedDraft(EMPTY_BED);
    flash("Beet angelegt.");
  };

  const deleteBed = (bedId) => {
    setState((prev) => ({ ...prev, beds: prev.beds.filter((bed) => bed.id !== bedId) }));
    setSelection((current) => current.bedId === bedId ? EMPTY_SELECTION : current);
    if (pathDraft?.bedId === bedId) setPathDraft(null);
    if (calendarBedId === bedId) setCalendarBedId("all");
    if (state.beds.length === 1) setCalendarFilter("all");
    flash("Beet entfernt.");
  };

  const addPlantAt = (bedId, cropId, position) => {
    const bed = state.beds.find((item) => item.id === bedId);
    const crop = state.crops.find((item) => item.id === cropId);
    if (!bed || !crop) return;
    const nextIndex = (bed.plantings || []).length;
    const requestedPosition = {
      x: position?.x ?? 16 + (nextIndex % 5) * 17,
      y: position?.y ?? 20 + (Math.floor(nextIndex / 5) % 4) * 20,
    };
    const plantPosition = bed.showGrid
      ? snapPositionToGrid(requestedPosition, bed, bed.gridSizeCm)
      : { x: clamp(requestedPosition.x), y: clamp(requestedPosition.y) };
    const planting = {
      id: createId("pflanze"),
      cropId,
      date: new Date().toISOString().slice(0, 10),
      ...plantPosition,
    };
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => bed.id === bedId ? { ...bed, plantings: [...(bed.plantings || []), planting], groups: bed.groups ?? [] } : bed),
    }));
    setSelection({ bedId, plantingIds: [planting.id], pathIds: [], groupId: null });
    setPaletteMenu(null);
    flash(`${crop.name} platziert.`);
  };

  const removeItems = (bedId, plantingIds = [], pathIds = [], message = "Element entfernt.") => {
    const previousBed = state.beds.find((bed) => bed.id === bedId);
    if (!previousBed || (!plantingIds.length && !pathIds.length)) return;
    const removedPlantingIds = new Set(plantingIds);
    const removedPathIds = new Set(pathIds);
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => {
        if (bed.id !== bedId) return bed;
        const plantings = (bed.plantings || []).filter((item) => !removedPlantingIds.has(item.id));
        const paths = (bed.paths || []).filter((item) => !removedPathIds.has(item.id));
        return { ...bed, plantings, paths, groups: normalizeGroups(bed.groups, plantings, paths, bed.gridSizeCm) };
      }),
    }));
    setSelection(EMPTY_SELECTION);
    setEditingGroupId(null);
    setUndoState({ bed: previousBed, message });
  };

  const removePlantings = (bedId, plantingIds, message = "Pflanze entfernt.") => removeItems(bedId, plantingIds, [], message);
  const removePaths = (bedId, pathIds, message = "Weg entfernt.") => removeItems(bedId, [], pathIds, message);

  const restoreLastRemoval = () => {
    if (!undoState) return;
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => bed.id === undoState.bed.id ? undoState.bed : bed),
    }));
    setUndoState(null);
    flash("Löschen rückgängig gemacht.");
  };

  const createGroup = (bedId, plantingIds, pathIds = []) => {
    const bed = state.beds.find((item) => item.id === bedId);
    if (!bed) return;
    const groupedPlantingIds = new Set((bed.groups ?? []).flatMap((group) => getGroupMemberIds(group, "planting")));
    const groupedPathIds = new Set((bed.groups ?? []).flatMap((group) => getGroupMemberIds(group, "path")));
    const groupablePlantingIds = [...new Set(plantingIds)].filter((id) => !groupedPlantingIds.has(id));
    const groupablePathIds = [...new Set(pathIds)].filter((id) => !groupedPathIds.has(id));
    const members = [
      ...groupablePlantingIds.map((id) => ({ type: "planting", id })),
      ...groupablePathIds.map((id) => ({ type: "path", id })),
    ];
    if (members.length < 2) return flash("Mindestens zwei ungruppierte Elemente werden benötigt.");
    const anchors = [
      ...bed.plantings.filter((planting) => groupablePlantingIds.includes(planting.id)).map((item) => ({ x: Number(item.x), y: Number(item.y) })),
      ...(bed.paths ?? []).filter((path) => groupablePathIds.includes(path.id)).map((item) => ({ x: Number(item.originX), y: Number(item.originY) })),
    ];
    const group = {
      id: createId("gruppe"),
      members,
      originX: Math.min(...anchors.map((item) => item.x)),
      originY: Math.min(...anchors.map((item) => item.y)),
      gridSizeCm: bed.gridSizeCm,
    };
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((item) => item.id === bedId ? { ...item, groups: [...(item.groups ?? []), group] } : item),
    }));
    setSelection({ bedId, plantingIds: groupablePlantingIds, pathIds: groupablePathIds, groupId: group.id });
    setEditingGroupId(null);
    flash(`${members.length} Elemente gruppiert.`);
  };

  const ungroup = (bedId, groupId) => {
    setState((prev) => ({ ...prev, beds: prev.beds.map((bed) => bed.id === bedId ? { ...bed, groups: (bed.groups ?? []).filter((group) => group.id !== groupId) } : bed) }));
    setSelection((current) => ({ ...current, groupId: null }));
    setEditingGroupId(null);
    flash("Gruppierung gelöst.");
  };

  const deleteGroup = (bedId, groupId) => {
    const bed = state.beds.find((item) => item.id === bedId);
    const group = bed?.groups?.find((item) => item.id === groupId);
    if (group) removeItems(bedId, getGroupMemberIds(group, "planting"), getGroupMemberIds(group, "path"), `Gruppe mit ${group.members.length} Elementen gelöscht.`);
  };

  const updateBedSpacing = (bedId, showSpacing) => {
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => bed.id === bedId ? { ...bed, showSpacing } : bed),
    }));
  };

  const updateGridSettings = (bedId, showGrid, gridSizeCm, groupId = null) => {
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => {
        if (bed.id !== bedId) return bed;
        if (!showGrid) return { ...bed, showGrid: false };
        if (groupId) {
          const groups = (bed.groups ?? []).map((group) => group.id === groupId ? { ...group, gridSizeCm } : group);
          const group = groups.find((item) => item.id === groupId);
          if (!group) return { ...bed, showGrid: true };
          const groupPlantingIds = new Set(getGroupMemberIds(group, "planting"));
          const groupPathIds = new Set(getGroupMemberIds(group, "path"));
          return {
            ...bed,
            showGrid: true,
            groups,
            plantings: bed.plantings.map((planting) => groupPlantingIds.has(planting.id)
              ? { ...planting, ...snapPositionToGroupGrid(planting, group, bed, gridSizeCm) }
              : planting),
            paths: (bed.paths ?? []).map((path) => {
              if (!groupPathIds.has(path.id)) return path;
              const snapped = snapPositionToGroupGrid({ x: path.originX, y: path.originY }, group, bed, gridSizeCm);
              return { ...path, originX: snapped.x, originY: snapped.y };
            }),
          };
        }
        return {
          ...bed,
          showGrid: true,
          gridSizeCm,
          plantings: bed.plantings.map((planting) => ({ ...planting, ...snapPositionToGrid(planting, bed, gridSizeCm) })),
        };
      }),
    }));
  };

  const positionFromPointer = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const startPathDrawing = (bed) => {
    setPathDraft({ bedId: bed.id, cellSizeCm: bed.gridSizeCm, cells: [], history: [], frame: null });
    setSelection(EMPTY_SELECTION);
    setEditingGroupId(null);
  };

  const stopPathDrawing = () => {
    if (!pathDraft) return;
    pathFrameRef.current = null;
    setPathDraft(null);
  };

  const confirmPathDrawing = (bed) => {
    if (!pathDraft || pathDraft.bedId !== bed.id) return;
    const paths = splitPathCells(pathDraft.cells, pathDraft.cellSizeCm, bed);
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((item) => item.id === bed.id
        ? { ...item, paths: [...(item.paths ?? []), ...paths] }
        : item),
    }));
    if (paths.length) setUndoState({ bed, message: `${paths.length} ${paths.length === 1 ? "Weg" : "Wege"} angelegt.` });
    pathFrameRef.current = null;
    setPathDraft(null);
  };

  const pathCellFromPointer = (event, canvas, bed, cellSizeCm) => {
    const position = positionFromPointer(event, canvas);
    const maxColumn = Math.max(0, Math.floor((Number(bed.length) * 100) / cellSizeCm) - 1);
    const maxRow = Math.max(0, Math.floor((Number(bed.width) * 100) / cellSizeCm) - 1);
    return {
      column: clamp(Math.floor(((position.x / 100) * Number(bed.length) * 100) / cellSizeCm), 0, maxColumn),
      row: clamp(Math.floor(((position.y / 100) * Number(bed.width) * 100) / cellSizeCm), 0, maxRow),
    };
  };

  const beginPathFrame = (event, bed) => {
    if (!pathDraft || pathDraft.bedId !== bed.id || (event.button !== 0 && event.pointerType === "mouse")) return;
    const start = pathCellFromPointer(event, event.currentTarget, bed, pathDraft.cellSizeCm);
    event.currentTarget.setPointerCapture(event.pointerId);
    pathFrameRef.current = { bedId: bed.id, start, current: start };
    setPathDraft((current) => ({ ...current, frame: { start, current: start } }));
  };

  const continuePathFrame = (event, bed) => {
    if (pathFrameRef.current?.bedId !== bed.id || !pathDraft) return;
    const currentCell = pathCellFromPointer(event, event.currentTarget, bed, pathDraft.cellSizeCm);
    pathFrameRef.current.current = currentCell;
    setPathDraft((current) => ({ ...current, frame: { start: pathFrameRef.current.start, current: currentCell } }));
  };

  const finishPathFrame = (event, bed) => {
    const frame = pathFrameRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pathFrameRef.current = null;
    if (!frame || frame.bedId !== bed.id) return;
    if (event.type === "pointercancel") {
      setPathDraft((current) => current ? { ...current, frame: null } : current);
      return;
    }
    setPathDraft((current) => {
      if (!current || current.bedId !== bed.id) return current;
      const previousCells = current.cells;
      const selected = new Map(previousCells.map((cell) => [`${cell.column}:${cell.row}`, cell]));
      const remove = selected.has(`${frame.start.column}:${frame.start.row}`);
      const minColumn = Math.min(frame.start.column, frame.current.column);
      const maxColumn = Math.max(frame.start.column, frame.current.column);
      const minRow = Math.min(frame.start.row, frame.current.row);
      const maxRow = Math.max(frame.start.row, frame.current.row);
      for (let column = minColumn; column <= maxColumn; column += 1) {
        for (let row = minRow; row <= maxRow; row += 1) {
          const key = `${column}:${row}`;
          if (remove) selected.delete(key);
          else selected.set(key, { column, row });
        }
      }
      return { ...current, cells: [...selected.values()], history: [...current.history, previousCells], frame: null };
    });
  };

  const undoPathStep = () => {
    setPathDraft((current) => {
      if (!current?.history.length) return current;
      return { ...current, cells: current.history.at(-1), history: current.history.slice(0, -1), frame: null };
    });
  };

  const handleBedDrop = (event, bedId) => {
    event.preventDefault();
    const cropId = event.dataTransfer.getData("application/x-garden-crop") || event.dataTransfer.getData("text/plain");
    if (!state.crops.some((crop) => crop.id === cropId)) return;
    addPlantAt(bedId, cropId, positionFromPointer(event, event.currentTarget));
  };

  const moveItemSet = (bedId, plantingIds, pathIds, originals, requestedDelta, groupId, editMember = false) => {
    const movedPlantingIds = new Set(plantingIds);
    const movedPathIds = new Set(pathIds);
    setState((prev) => ({
      ...prev,
      beds: prev.beds.map((bed) => {
        if (bed.id !== bedId) return bed;
        const group = (bed.groups ?? []).find((item) => item.id === groupId);
        let deltaX = requestedDelta.x;
        let deltaY = requestedDelta.y;
        const originalValues = [
          ...plantingIds.map((id) => originals.plantings[id]),
          ...pathIds.map((id) => originals.paths[id]),
        ].filter(Boolean);
        if (!originalValues.length) return bed;

        if (bed.showGrid && editMember && group && plantingIds.length + pathIds.length === 1) {
          const original = originalValues[0];
          const snapped = snapPositionToGroupGrid({ x: original.x + deltaX, y: original.y + deltaY }, group, bed);
          deltaX = snapped.x - original.x;
          deltaY = snapped.y - original.y;
        } else if (bed.showGrid) {
          const anchor = {
            x: Math.min(...originalValues.map((position) => position.x)),
            y: Math.min(...originalValues.map((position) => position.y)),
          };
          const snapped = snapPositionToGrid({ x: anchor.x + deltaX, y: anchor.y + deltaY }, bed, bed.gridSizeCm);
          deltaX = snapped.x - anchor.x;
          deltaY = snapped.y - anchor.y;
        }

        const horizontalBounds = [
          ...plantingIds.map((id) => ({ left: originals.plantings[id].x, right: originals.plantings[id].x })),
          ...pathIds.map((id) => {
            const path = bed.paths.find((item) => item.id === id);
            const bounds = getPathBounds({ ...path, originX: originals.paths[id].x, originY: originals.paths[id].y }, bed);
            return { left: bounds.left, right: bounds.right };
          }),
        ];
        const verticalBounds = [
          ...plantingIds.map((id) => ({ top: originals.plantings[id].y, bottom: originals.plantings[id].y })),
          ...pathIds.map((id) => {
            const path = bed.paths.find((item) => item.id === id);
            const bounds = getPathBounds({ ...path, originX: originals.paths[id].x, originY: originals.paths[id].y }, bed);
            return { top: bounds.top, bottom: bounds.bottom };
          }),
        ];
        deltaX = clamp(deltaX, -Math.min(...horizontalBounds.map((bounds) => bounds.left)), 100 - Math.max(...horizontalBounds.map((bounds) => bounds.right)));
        deltaY = clamp(deltaY, -Math.min(...verticalBounds.map((bounds) => bounds.top)), 100 - Math.max(...verticalBounds.map((bounds) => bounds.bottom)));

        const plantings = bed.plantings.map((planting) => movedPlantingIds.has(planting.id)
          ? { ...planting, x: originals.plantings[planting.id].x + deltaX, y: originals.plantings[planting.id].y + deltaY }
          : planting);
        const paths = (bed.paths ?? []).map((path) => movedPathIds.has(path.id)
          ? { ...path, originX: originals.paths[path.id].x + deltaX, originY: originals.paths[path.id].y + deltaY }
          : path);
        const groups = (bed.groups ?? []).map((item) => {
          const wholeGroupMoves = !editMember && item.members.every((member) => member.type === "planting" ? movedPlantingIds.has(member.id) : movedPathIds.has(member.id));
          const originalGroup = item.id === groupId ? originals.group : null;
          return wholeGroupMoves && originalGroup ? { ...item, originX: clamp(originalGroup.x + deltaX), originY: clamp(originalGroup.y + deltaY) } : item;
        });
        return { ...bed, plantings, paths, groups };
      }),
    }));
  };

  const beginPlantMove = (event, bedId, plantingId) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.stopPropagation();
    const bed = state.beds.find((item) => item.id === bedId);
    if (!bed) return;
    const group = (bed.groups ?? []).find((item) => getGroupMemberIds(item, "planting").includes(plantingId));
    if (event.ctrlKey || event.metaKey) {
      setSelection((current) => {
        const currentIds = current.bedId === bedId ? current.plantingIds : [];
        const nextIds = currentIds.includes(plantingId) ? currentIds.filter((id) => id !== plantingId) : [...currentIds, plantingId];
        return nextIds.length || current.pathIds.length ? { bedId, plantingIds: nextIds, pathIds: current.bedId === bedId ? current.pathIds : [], groupId: null } : EMPTY_SELECTION;
      });
      setEditingGroupId(null);
      return;
    }

    const editMember = group && editingGroupId === group.id;
    const keepMultiple = selection.bedId === bedId && selection.groupId === null && selection.plantingIds.length + selection.pathIds.length > 1 && selection.plantingIds.includes(plantingId);
    const plantingIds = editMember ? [plantingId] : keepMultiple ? selection.plantingIds : group ? getGroupMemberIds(group, "planting") : [plantingId];
    const pathIds = editMember ? [] : keepMultiple ? selection.pathIds : group ? getGroupMemberIds(group, "path") : [];
    const groupId = keepMultiple ? null : group ? group.id : null;
    setSelection({ bedId, plantingIds, pathIds, groupId });
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = { x: event.clientX, y: event.clientY };
    const originals = {
      plantings: Object.fromEntries(bed.plantings.filter((planting) => plantingIds.includes(planting.id)).map((planting) => [planting.id, { x: Number(planting.x), y: Number(planting.y) }])),
      paths: Object.fromEntries((bed.paths ?? []).filter((path) => pathIds.includes(path.id)).map((path) => [path.id, { x: Number(path.originX), y: Number(path.originY) }])),
      group: group ? { x: Number(group.originX), y: Number(group.originY) } : null,
    };
    movingPlantRef.current = { bedId, plantingId, plantingIds, pathIds, groupId, editMember, originals, previousBed: bed, start, moved: false };
  };

  const continuePlantMove = (event, bedId, plantingId) => {
    const moving = movingPlantRef.current;
    if (!moving || moving.bedId !== bedId || moving.plantingId !== plantingId) return;
    const canvas = event.currentTarget.closest(".bed-visual");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const deltaPixels = { x: event.clientX - moving.start.x, y: event.clientY - moving.start.y };
    if (!moving.moved && Math.hypot(deltaPixels.x, deltaPixels.y) < 3) return;
    moving.moved = true;
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    moving.outside = outside;
    setDraggingOutside(outside);
    moveItemSet(bedId, moving.plantingIds, moving.pathIds, moving.originals, { x: (deltaPixels.x / rect.width) * 100, y: (deltaPixels.y / rect.height) * 100 }, moving.groupId, moving.editMember);
  };

  const finishPlantMove = (event) => {
    const moving = movingPlantRef.current;
    const canvas = event.currentTarget.closest(".bed-visual");
    const rect = canvas?.getBoundingClientRect();
    const outside = rect ? event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom : false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    movingPlantRef.current = null;
    setDraggingOutside(false);
    if (event.type === "pointercancel" || !moving?.moved) return;
    if (!outside) {
      if (moving.pathIds.length) setUndoState({ bed: moving.previousBed, message: "Auswahl verschoben." });
      return;
    }
    if (moving.groupId && !moving.editMember) {
      deleteGroup(moving.bedId, moving.groupId);
    } else if (moving.plantingIds.length === 1 && !moving.pathIds.length) {
      removePlantings(moving.bedId, moving.plantingIds);
    } else {
      setDeleteRequest({
        type: "items",
        bedId: moving.bedId,
        plantingIds: moving.plantingIds,
        pathIds: moving.pathIds,
        title: `${moving.plantingIds.length + moving.pathIds.length} Elemente löschen?`,
        message: "Die gemeinsam ausgewählten Elemente werden aus dem Beet entfernt.",
      });
    }
  };

  const beginPathMove = (event, bedId, pathId) => {
    if (pathDraft?.bedId === bedId || (event.button !== 0 && event.pointerType === "mouse")) return;
    event.stopPropagation();
    const bed = state.beds.find((item) => item.id === bedId);
    if (!bed) return;
    const group = (bed.groups ?? []).find((item) => getGroupMemberIds(item, "path").includes(pathId));
    if (event.ctrlKey || event.metaKey) {
      setSelection((current) => {
        const currentPathIds = current.bedId === bedId ? current.pathIds : [];
        const nextPathIds = currentPathIds.includes(pathId) ? currentPathIds.filter((id) => id !== pathId) : [...currentPathIds, pathId];
        const plantingIds = current.bedId === bedId ? current.plantingIds : [];
        return nextPathIds.length || plantingIds.length ? { bedId, plantingIds, pathIds: nextPathIds, groupId: null } : EMPTY_SELECTION;
      });
      setEditingGroupId(null);
      return;
    }
    const editMember = group && editingGroupId === group.id;
    const keepMultiple = selection.bedId === bedId && selection.groupId === null && selection.plantingIds.length + selection.pathIds.length > 1 && selection.pathIds.includes(pathId);
    const plantingIds = editMember ? [] : keepMultiple ? selection.plantingIds : group ? getGroupMemberIds(group, "planting") : [];
    const pathIds = editMember ? [pathId] : keepMultiple ? selection.pathIds : group ? getGroupMemberIds(group, "path") : [pathId];
    const groupId = keepMultiple ? null : group?.id ?? null;
    setSelection({ bedId, plantingIds, pathIds, groupId });
    event.currentTarget.setPointerCapture(event.pointerId);
    const originals = {
      plantings: Object.fromEntries(bed.plantings.filter((planting) => plantingIds.includes(planting.id)).map((planting) => [planting.id, { x: Number(planting.x), y: Number(planting.y) }])),
      paths: Object.fromEntries((bed.paths ?? []).filter((path) => pathIds.includes(path.id)).map((path) => [path.id, { x: Number(path.originX), y: Number(path.originY) }])),
      group: group ? { x: Number(group.originX), y: Number(group.originY) } : null,
    };
    movingPathRef.current = { bedId, pathId, plantingIds, pathIds, groupId, editMember, originals, previousBed: bed, start: { x: event.clientX, y: event.clientY }, moved: false };
  };

  const continuePathMove = (event, bedId, pathId) => {
    const moving = movingPathRef.current;
    if (!moving || moving.bedId !== bedId || moving.pathId !== pathId) return;
    const canvas = event.currentTarget.closest(".bed-visual");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const deltaPixels = { x: event.clientX - moving.start.x, y: event.clientY - moving.start.y };
    if (!moving.moved && Math.hypot(deltaPixels.x, deltaPixels.y) < 3) return;
    moving.moved = true;
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    setDraggingOutside(outside);
    moveItemSet(bedId, moving.plantingIds, moving.pathIds, moving.originals, { x: (deltaPixels.x / rect.width) * 100, y: (deltaPixels.y / rect.height) * 100 }, moving.groupId, moving.editMember);
  };

  const finishPathMove = (event) => {
    const moving = movingPathRef.current;
    const canvas = event.currentTarget.closest(".bed-visual");
    const rect = canvas?.getBoundingClientRect();
    const outside = rect ? event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom : false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    movingPathRef.current = null;
    setDraggingOutside(false);
    if (event.type === "pointercancel" || !moving?.moved) return;
    if (!outside) {
      setUndoState({ bed: moving.previousBed, message: "Weg verschoben." });
      return;
    }
    if (moving.groupId && !moving.editMember) deleteGroup(moving.bedId, moving.groupId);
    else if (moving.pathIds.length === 1 && !moving.plantingIds.length) removePaths(moving.bedId, moving.pathIds);
    else setDeleteRequest({
      type: "items",
      bedId: moving.bedId,
      plantingIds: moving.plantingIds,
      pathIds: moving.pathIds,
      title: `${moving.plantingIds.length + moving.pathIds.length} Elemente löschen?`,
      message: "Die gemeinsam ausgewählten Elemente werden aus dem Beet entfernt.",
    });
  };

  const beginSelectionFrame = (event, bedId) => {
    if (event.target !== event.currentTarget || (event.button !== 0 && event.pointerType === "mouse")) return;
    const start = positionFromPointer(event, event.currentTarget);
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionFrameRef.current = { bedId, start, current: start };
    setSelectionFrame({ bedId, start, current: start });
  };

  const continueSelectionFrame = (event, bedId) => {
    if (selectionFrameRef.current?.bedId !== bedId) return;
    const current = positionFromPointer(event, event.currentTarget);
    selectionFrameRef.current.current = current;
    setSelectionFrame({ bedId, start: selectionFrameRef.current.start, current });
  };

  const finishSelectionFrame = (event, bed) => {
    const frame = selectionFrameRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    selectionFrameRef.current = null;
    setSelectionFrame(null);
    if (!frame || frame.bedId !== bed.id) return;
    const left = Math.min(frame.start.x, frame.current.x);
    const right = Math.max(frame.start.x, frame.current.x);
    const top = Math.min(frame.start.y, frame.current.y);
    const bottom = Math.max(frame.start.y, frame.current.y);
    if (right - left < 1 && bottom - top < 1) {
      setSelection(EMPTY_SELECTION);
      setEditingGroupId(null);
      return;
    }
    const framedIds = bed.plantings.filter((planting) => planting.x >= left && planting.x <= right && planting.y >= top && planting.y <= bottom).map((planting) => planting.id);
    const framedPathIds = (bed.paths ?? []).filter((path) => {
      const bounds = getPathBounds(path, bed);
      return bounds.right >= left && bounds.left <= right && bounds.bottom >= top && bounds.top <= bottom;
    }).map((path) => path.id);
    const selectedIds = new Set(framedIds);
    const selectedPathIds = new Set(framedPathIds);
    for (const group of bed.groups ?? []) {
      const groupPlantingIds = getGroupMemberIds(group, "planting");
      const groupPathIds = getGroupMemberIds(group, "path");
      if (groupPlantingIds.some((id) => selectedIds.has(id)) || groupPathIds.some((id) => selectedPathIds.has(id))) {
        groupPlantingIds.forEach((id) => selectedIds.add(id));
        groupPathIds.forEach((id) => selectedPathIds.add(id));
      }
    }
    setSelection(selectedIds.size || selectedPathIds.size ? { bedId: bed.id, plantingIds: [...selectedIds], pathIds: [...selectedPathIds], groupId: null } : EMPTY_SELECTION);
    setEditingGroupId(null);
  };

  const nudgePlant = (event, bedId, planting) => {
    const bed = state.beds.find((item) => item.id === bedId);
    const stepCount = event.shiftKey ? 5 : 1;
    const group = bed?.groups?.find((item) => getGroupMemberIds(item, "planting").includes(planting.id));
    const editMember = group && editingGroupId === group.id;
    const plantingIds = selection.bedId === bedId && selection.plantingIds.includes(planting.id) ? selection.plantingIds : [planting.id];
    const pathIds = selection.bedId === bedId && selection.plantingIds.includes(planting.id) ? selection.pathIds : group && !editMember ? getGroupMemberIds(group, "path") : [];
    const gridSize = editMember ? group.gridSizeCm : bed?.gridSizeCm;
    const horizontalAmount = bed?.showGrid
      ? (gridSize / (Number(bed.length) * 100)) * 100 * stepCount
      : stepCount;
    const verticalAmount = bed?.showGrid
      ? (gridSize / (Number(bed.width) * 100)) * 100 * stepCount
      : stepCount;
    const offsets = {
      ArrowLeft: [-horizontalAmount, 0],
      ArrowRight: [horizontalAmount, 0],
      ArrowUp: [0, -verticalAmount],
      ArrowDown: [0, verticalAmount],
    };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (group && !editMember) deleteGroup(bedId, group.id);
      else if (plantingIds.length === 1 && !pathIds.length) removePlantings(bedId, plantingIds);
      else setDeleteRequest({ type: "items", bedId, plantingIds, pathIds, title: `${plantingIds.length + pathIds.length} Elemente löschen?`, message: "Die ausgewählten Elemente werden aus dem Beet entfernt." });
      return;
    }
    if (!offsets[event.key]) return;
    event.preventDefault();
    const originals = {
      plantings: Object.fromEntries(bed.plantings.filter((item) => plantingIds.includes(item.id)).map((item) => [item.id, { x: Number(item.x), y: Number(item.y) }])),
      paths: Object.fromEntries((bed.paths ?? []).filter((item) => pathIds.includes(item.id)).map((item) => [item.id, { x: Number(item.originX), y: Number(item.originY) }])),
      group: group ? { x: Number(group.originX), y: Number(group.originY) } : null,
    };
    moveItemSet(bedId, plantingIds, pathIds, originals, { x: offsets[event.key][0], y: offsets[event.key][1] }, group?.id ?? null, editMember);
  };

  const cropPlantingIds = (bedId, cropId) => state.beds.find((bed) => bed.id === bedId)?.plantings.filter((planting) => planting.cropId === cropId).map((planting) => planting.id) ?? [];

  const selectCropPlantings = (bedId, cropId) => {
    const plantingIds = cropPlantingIds(bedId, cropId);
    setSelection(plantingIds.length ? { bedId, plantingIds, pathIds: [], groupId: null } : EMPTY_SELECTION);
    setEditingGroupId(null);
    setPaletteMenu(null);
  };

  const groupCropPlantings = (bedId, cropId) => {
    createGroup(bedId, cropPlantingIds(bedId, cropId));
    setPaletteMenu(null);
  };

  const requestCropPlantingDeletion = (bedId, crop) => {
    const plantingIds = cropPlantingIds(bedId, crop.id);
    if (!plantingIds.length) return;
    setPaletteMenu(null);
    setDeleteRequest({
      type: "plantings",
      bedId,
      plantingIds,
      title: `Alle ${crop.name}-Pflanzen löschen?`,
      message: `${plantingIds.length} ${crop.name}-Pflanzen werden aus diesem Beet entfernt.`,
    });
  };

  const handlePaletteClick = (event, bedId, cropId) => {
    window.clearTimeout(paletteClickTimerRef.current);
    if (event.detail > 1) return;
    paletteClickTimerRef.current = window.setTimeout(() => setPaletteMenu({ bedId, cropId }), 230);
  };

  const handlePaletteDoubleClick = (event, bedId, cropId) => {
    event.preventDefault();
    window.clearTimeout(paletteClickTimerRef.current);
    setPaletteMenu(null);
    addPlantAt(bedId, cropId);
  };

  const applyCultureProfile = (profile, growingProfile, name) => {
    const timing = profile[growingProfile] || profile.outdoor;
    setCropDraft((prev) => ({
      ...prev,
      name: name ?? prev.name,
      growingProfile,
      ...timing,
      spacing: profile.spacing,
      color: profile.color,
      icon: profile.name.slice(0, 2),
    }));
    setPhaseStatus({ type: "auto", profileName: profile.name });
  };

  const handleCropNameChange = (value) => {
    const profile = findCultureProfile(value);
    if (profile) {
      applyCultureProfile(profile, cropDraft.growingProfile || "outdoor", value);
      return;
    }
    setCropDraft((prev) => ({ ...prev, name: value }));
    setPhaseStatus({ type: value.trim().length >= 3 ? "unknown" : "idle" });
  };

  const handleGrowingProfileChange = (growingProfile) => {
    const profile = findCultureProfile(cropDraft.name);
    if (profile) {
      applyCultureProfile(profile, growingProfile);
      return;
    }
    setCropDraft((prev) => ({ ...prev, growingProfile }));
    setPhaseStatus({ type: cropDraft.name.trim() ? "unknown" : "idle" });
  };

  const updateManualPhase = (field, value) => {
    setCropDraft((prev) => ({ ...prev, [field]: value }));
    setPhaseStatus((prev) => ({ ...prev, type: "manual" }));
  };

  const saveCrop = (event) => {
    event.preventDefault();
    if (!cropDraft.name.trim()) return flash("Ein Kulturname fehlt.");
    const crop = {
      ...cropDraft,
      id: editingCrop || createId("kultur"),
      name: cropDraft.name.trim(),
      icon: cropDraft.icon.trim() || cropDraft.name.trim().slice(0, 2),
      sowStart: Number(cropDraft.sowStart),
      sowEnd: Number(cropDraft.sowEnd),
      harvestStart: Number(cropDraft.harvestStart),
      harvestEnd: Number(cropDraft.harvestEnd),
      spacing: Math.max(1, Number(cropDraft.spacing) || 1),
      rating: normalizeRating(cropDraft.rating),
    };
    setState((prev) => ({
      ...prev,
      crops: editingCrop ? prev.crops.map((item) => item.id === editingCrop ? crop : item) : [...prev.crops, crop],
    }));
    setCropDraft(EMPTY_CROP);
    setPhaseStatus({ type: "idle" });
    setEditingCrop(null);
    flash(editingCrop ? "Kultur aktualisiert." : "Kultur angelegt.");
  };

  const beginEditCrop = (crop) => {
    setEditingCrop(crop.id);
    setCropDraft({ ...crop, growingProfile: crop.growingProfile || "outdoor" });
    setPhaseStatus({ type: "existing", profileName: findCultureProfile(crop.name)?.name });
    document.getElementById("kultur-formular")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteCrop = (cropId) => {
    setState((prev) => ({
      ...prev,
      crops: prev.crops.filter((crop) => crop.id !== cropId),
      beds: prev.beds.map((bed) => {
        const plantings = (bed.plantings || []).filter((item) => item.cropId !== cropId);
        return { ...bed, plantings, groups: normalizeGroups(bed.groups, plantings, bed.paths, bed.gridSizeCm) };
      }),
    }));
    setSelection(EMPTY_SELECTION);
    flash("Kultur und zugehörige Einträge entfernt.");
  };

  const confirmDeletion = () => {
    if (deleteRequest?.type === "bed") deleteBed(deleteRequest.id);
    if (deleteRequest?.type === "crop") deleteCrop(deleteRequest.id);
    if (deleteRequest?.type === "plantings") removePlantings(deleteRequest.bedId, deleteRequest.plantingIds, `${deleteRequest.plantingIds.length} Pflanzen gelöscht.`);
    if (deleteRequest?.type === "items") removeItems(deleteRequest.bedId, deleteRequest.plantingIds, deleteRequest.pathIds, `${deleteRequest.plantingIds.length + deleteRequest.pathIds.length} Elemente gelöscht.`);
    setDeleteRequest(null);
  };

  const updateCropRating = (cropId, rating) => {
    setState((prev) => ({
      ...prev,
      crops: prev.crops.map((crop) => crop.id === cropId ? { ...crop, rating: normalizeRating(rating) } : crop),
    }));
    flash("Bewertung gespeichert.");
  };

  const exportGarden = () => {
    const blob = new Blob([JSON.stringify({ beds: state.beds, crops: state.crops, spacingTransparency: state.spacingTransparency }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gemuesegarten-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    flash("Sicherung exportiert.");
  };

  const importGarden = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.beds) || !Array.isArray(data.crops)) throw new Error("invalid");
      setState((prev) => ({
        ...prev,
        beds: normalizeBeds(data.beds, undefined, {
          showSpacing: data.showSpacing !== false,
          showGrid: data.showGrid === true,
          gridSizeCm: Math.min(100, Math.max(5, Number(data.gridSizeCm) || 20)),
        }),
        crops: normalizeCrops(data.crops),
        spacingTransparency: Number.isFinite(Number(data.spacingTransparency))
          ? Math.min(100, Math.max(0, Number(data.spacingTransparency)))
          : 25,
      }));
      setSelection(EMPTY_SELECTION);
      setEditingGroupId(null);
      setPathDraft(null);
      flash("Sicherung importiert.");
    } catch {
      flash("Diese Datei ist keine gültige Gartensicherung.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>✦</span></div>
          <div><p>Gartenjournal</p><h1>Mein Gemüsegarten</h1></div>
        </div>
        <div className="header-actions">
          <button 
            className="button ghost compact" 
            onClick={() => setDarkMode(!darkMode)} 
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button className="button ghost compact" onClick={() => importRef.current?.click()}>Import</button>
          <button className="button secondary compact" onClick={exportGarden}>Sichern</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importGarden} />
        </div>
      </header>

      <section className="overview" aria-label="Gartenübersicht">
        <div className="overview-copy">
          <span className="eyebrow">Saison {new Date().getFullYear()}</span>
          <h2>Planen, pflanzen,<br /><em>ernten.</em></h2>
          <p>Beete strukturieren, Kulturen verwalten und den richtigen Zeitpunkt im Blick behalten.</p>
        </div>
        <div className="season-card">
          <div className="season-heading"><span>Aktueller Monat</span><strong>{MONTHS_LONG[currentMonth - 1]}</strong></div>
          <div className="season-stats">
            <div><b>{state.beds.length}</b><span>Beete</span></div>
            <div><b>{plantedCount}</b><span>Pflanzungen</span></div>
            <div><b>{harvestNow.length}</b><span>jetzt erntereif</span></div>
          </div>
          <div className="season-track"><span style={{ width: `${(currentMonth / 12) * 100}%` }} /></div>
        </div>
      </section>

      <nav className="tabs" aria-label="Bereiche">
        {[
          ["beete", "Beetplanung", state.beds.length],
          ["kalender", "Pflanzkalender", null],
          ["kulturen", "Kulturen", state.crops.length],
        ].map(([id, label, count]) => (
          <button key={id} className={state.activeTab === id ? "active" : ""} onClick={() => setState((prev) => ({ ...prev, activeTab: id }))}>
            {label}{count !== null && <span>{count}</span>}
          </button>
        ))}
      </nav>

      {state.activeTab === "beete" && (
        <section className="workspace" aria-labelledby="beete-title">
          <div className="section-heading">
            <div><span className="section-kicker">Flächen</span><h2 id="beete-title">Beetplanung</h2></div>
            <div className="bed-heading-tools">
              <label className="grid-size-control spacing-transparency-control global-transparency-control">
                <span>Transparenz aller Pflanzabstände</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={state.spacingTransparency}
                  aria-label="Transparenz aller Pflanzabstände"
                  onChange={(event) => setState((prev) => ({ ...prev, spacingTransparency: Number(event.target.value) }))}
                />
                <output>{state.spacingTransparency} %</output>
              </label>
            </div>
          </div>

          <form className="inline-form" onSubmit={addBed}>
            <label className="grow"><span>Beetname</span><input value={bedDraft.name} onChange={(e) => setBedDraft({ ...bedDraft, name: e.target.value })} placeholder="z. B. Sonnenbeet" /></label>
            <label><span>Breite (m)</span><input type="number" min="0.2" step="0.1" value={bedDraft.width} onChange={(e) => setBedDraft({ ...bedDraft, width: e.target.value })} /></label>
            <label><span>Länge (m)</span><input type="number" min="0.2" step="0.1" value={bedDraft.length} onChange={(e) => setBedDraft({ ...bedDraft, length: e.target.value })} /></label>
            <button className="button primary" type="submit"><span>＋</span> Beet anlegen</button>
          </form>

          {state.beds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration" aria-hidden="true"><i /><i /><i /><i /><span>✦</span></div>
              <h3>Noch ist alles möglich.</h3>
              <p>Mit dem ersten Beet beginnt die Planung. Name und Maße genügen für den Start.</p>
              <button className="text-button" onClick={() => document.querySelector(".inline-form input")?.focus()}>Erstes Beet anlegen <span>→</span></button>
            </div>
          ) : (
            <div className="bed-grid">
              {state.beds.map((bed) => {
                const bedSelection = selection.bedId === bed.id ? selection : EMPTY_SELECTION;
                const selectedIds = new Set(bedSelection.plantingIds);
                const selectedPathIds = new Set(bedSelection.pathIds);
                const activeBedGroup = (bed.groups ?? []).find((group) => group.id === bedSelection.groupId) ?? null;
                const activeGroupPlantingIds = new Set(getGroupMemberIds(activeBedGroup, "planting"));
                const activeGroupPathIds = new Set(getGroupMemberIds(activeBedGroup, "path"));
                const primarySelection = bed.plantings.find((planting) => selectedIds.has(planting.id));
                const primaryPathSelection = (bed.paths ?? []).find((path) => selectedPathIds.has(path.id));
                const selectedCrop = primarySelection ? state.crops.find((crop) => crop.id === primarySelection.cropId) : null;
                const groupedIds = new Set((bed.groups ?? []).flatMap((group) => getGroupMemberIds(group, "planting")));
                const groupedPathIds = new Set((bed.groups ?? []).flatMap((group) => getGroupMemberIds(group, "path")));
                const selectedItemCount = bedSelection.plantingIds.length + bedSelection.pathIds.length;
                const bedLengthCm = Number(bed.length) * 100;
                const bedWidthCm = Number(bed.width) * 100;
                const bedRatio = Number(bed.length) / Number(bed.width);
                const activeGridSize = activeBedGroup?.gridSizeCm ?? bed.gridSizeCm;
                const movingIds = movingPlantRef.current?.bedId === bed.id && movingPlantRef.current.moved
                  ? movingPlantRef.current.plantingIds
                  : movingPathRef.current?.bedId === bed.id && movingPathRef.current.moved
                    ? movingPathRef.current.plantingIds
                    : [];
                const overlapIds = new Set(movingIds.length ? getSpacingOverlapIds(bed.plantings, state.crops, bed, movingIds) : []);
                const drawingPaths = pathDraft?.bedId === bed.id;

                return (
                  <article className="bed-card" key={bed.id}>
                    <div className="bed-card-head">
                      <div><span>{bed.width} × {bed.length} m · {(bed.width * bed.length).toFixed(1)} m²</span><h3>{bed.name}</h3></div>
                      <button
                        className="icon-button"
                        type="button"
                        title="Beet entfernen"
                        aria-label={`${bed.name} entfernen`}
                        onClick={() => setDeleteRequest({
                          type: "bed",
                          id: bed.id,
                          title: `Beet „${bed.name}“ löschen?`,
                          message: "Das Beet und alle darin platzierten Pflanzen werden endgültig entfernt.",
                        })}
                      >×</button>
                    </div>

                    <div className="bed-planner-controls" aria-label={`Darstellung für ${bed.name}`}>
                      <label className="distance-toggle">
                        <input type="checkbox" checked={bed.showSpacing} onChange={(event) => updateBedSpacing(bed.id, event.target.checked)} />
                        <span aria-hidden="true"><i /></span>
                        <b>Pflanzabstände</b>
                      </label>
                      <label className="distance-toggle">
                        <input type="checkbox" checked={bed.showGrid || drawingPaths} disabled={drawingPaths} onChange={(event) => updateGridSettings(bed.id, event.target.checked, activeGridSize, activeBedGroup?.id)} />
                        <span aria-hidden="true"><i /></span>
                        <b>Raster &amp; Einrasten</b>
                      </label>
                      <label className="grid-size-control bed-grid-size-control">
                        <span>{activeBedGroup ? "Gruppenrasterweite" : "Rasterweite"}</span>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={activeGridSize}
                          disabled={!bed.showGrid || drawingPaths}
                          aria-label={`${activeBedGroup ? "Gruppenrasterweite" : "Rasterweite"} für ${bed.name}`}
                          onChange={(event) => updateGridSettings(bed.id, true, Number(event.target.value), activeBedGroup?.id)}
                        />
                        <output>{activeGridSize} cm</output>
                      </label>
                      <div className="path-tools">
                        {drawingPaths ? (
                          <>
                            <button type="button" disabled={!pathDraft.history.length} onClick={undoPathStep}>Rückgängig</button>
                            <button type="button" className="primary" onClick={() => confirmPathDrawing(bed)}>Übernehmen</button>
                            <button type="button" onClick={stopPathDrawing}>Abbrechen</button>
                          </>
                        ) : (
                          <button type="button" disabled={Boolean(pathDraft)} onClick={() => startPathDrawing(bed)}>Wege zeichnen</button>
                        )}
                      </div>
                    </div>

                    <div className="bed-editor">
                      <aside className="plant-palette" aria-label={`Pflanzen für ${bed.name}`}>
                        <div className="palette-head">
                          <div><b>Pflanzen</b><span>Ziehen oder doppelklicken</span></div>
                          <div className="palette-rating-filter" role="group" aria-label="Pflanzen nach Bewertung filtern">
                            {[['all', 'Alle'], ['1', '★'], ['2', '★★'], ['3', '★★★']].map(([value, label]) => (
                              <button
                                type="button"
                                key={value}
                                className={paletteRatingFilter === value ? "active" : ""}
                                aria-pressed={paletteRatingFilter === value}
                                onClick={() => setPaletteRatingFilter(value)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="palette-list">
                          {paletteCrops.map((crop) => (
                            <div className="palette-crop-entry" key={crop.id}>
                              <button
                                type="button"
                                className="palette-crop"
                                draggable
                                onDragStart={(event) => {
                                  window.clearTimeout(paletteClickTimerRef.current);
                                  setPaletteMenu(null);
                                  event.dataTransfer.effectAllowed = "copy";
                                  event.dataTransfer.setData("application/x-garden-crop", crop.id);
                                  event.dataTransfer.setData("text/plain", crop.id);
                                }}
                                onClick={(event) => handlePaletteClick(event, bed.id, crop.id)}
                                onDoubleClick={(event) => handlePaletteDoubleClick(event, bed.id, crop.id)}
                                title={`${crop.name}: ziehen oder doppelklicken`}
                              >
                                <i style={{ background: crop.color }}>{crop.icon}</i>
                                <span><b>{crop.name}</b><small>{crop.spacing} cm Abstand · {"★".repeat(crop.rating)}</small></span>
                                <em aria-hidden="true">⋯</em>
                              </button>
                              {paletteMenu?.bedId === bed.id && paletteMenu.cropId === crop.id && (() => {
                                const cropIds = cropPlantingIds(bed.id, crop.id);
                                const ungroupedCount = cropIds.filter((id) => !groupedIds.has(id)).length;
                                return (
                                  <div className="palette-context-menu" role="menu" aria-label={`${crop.name} verwalten`}>
                                    <button type="button" onClick={() => addPlantAt(bed.id, crop.id)}>Eine hinzufügen</button>
                                    <button type="button" disabled={!cropIds.length} onClick={() => selectCropPlantings(bed.id, crop.id)}>Alle markieren <span>{cropIds.length}</span></button>
                                    <button type="button" disabled={ungroupedCount < 2} onClick={() => groupCropPlantings(bed.id, crop.id)}>Alle gruppieren <span>{ungroupedCount}</span></button>
                                    <button type="button" className="danger" disabled={!cropIds.length} onClick={() => requestCropPlantingDeletion(bed.id, crop)}>Alle löschen <span>{cropIds.length}</span></button>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                          {paletteCrops.length === 0 && <p className="palette-empty">Keine Kultur mit dieser Bewertung.</p>}
                        </div>
                      </aside>

                      <div className="bed-canvas-panel">
                        <div className="bed-scale"><span>↔ Länge {bed.length} m</span><span>↕ Breite {bed.width} m</span></div>
                        <div className="bed-scroll">
                          <div
                            className={`bed-visual ${activeBedGroup ? "group-focus" : ""} ${drawingPaths ? "path-drawing" : ""} ${draggingOutside && selection.bedId === bed.id ? "delete-drop-active" : ""}`}
                            style={{
                              aspectRatio: `${bed.length} / ${bed.width}`,
                              minWidth: `${Math.max(520, bedRatio * 250)}px`,
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "copy";
                            }}
                            onDrop={(event) => handleBedDrop(event, bed.id)}
                            onPointerDown={(event) => drawingPaths ? beginPathFrame(event, bed) : beginSelectionFrame(event, bed.id)}
                            onPointerMove={(event) => drawingPaths ? continuePathFrame(event, bed) : continueSelectionFrame(event, bed.id)}
                            onPointerUp={(event) => drawingPaths ? finishPathFrame(event, bed) : finishSelectionFrame(event, bed)}
                            onPointerCancel={(event) => drawingPaths ? finishPathFrame(event, bed) : finishSelectionFrame(event, bed)}
                          >
                            {(bed.plantings || []).length === 0 && <span className="bed-empty">Pflanze hier ablegen</span>}

                            {(bed.showGrid || drawingPaths) && (
                              <div
                                className="grid-layer"
                                style={{
                                  "--grid-x": `${(bed.gridSizeCm / bedLengthCm) * 100}%`,
                                  "--grid-y": `${(bed.gridSizeCm / bedWidthCm) * 100}%`,
                                }}
                                aria-hidden="true"
                              />
                            )}

                            <div className="path-layer">
                              {(bed.paths ?? []).flatMap((path) => {
                                const pathGroup = (bed.groups ?? []).find((group) => getGroupMemberIds(group, "path").includes(path.id));
                                const cellWidth = (path.cellSizeCm / bedLengthCm) * 100;
                                const cellHeight = (path.cellSizeCm / bedWidthCm) * 100;
                                return path.cells.map((cell) => (
                                  <button
                                    type="button"
                                    tabIndex={cell.column === path.cells[0].column && cell.row === path.cells[0].row ? 0 : -1}
                                    key={`${path.id}-${cell.column}-${cell.row}`}
                                    className={`path-cell ${selectedPathIds.has(path.id) ? "selected" : ""} ${activeBedGroup && !activeGroupPathIds.has(path.id) ? "inactive" : ""} ${pathGroup ? "grouped" : ""}`}
                                    style={{
                                      left: `${Number(path.originX) + cell.column * cellWidth}%`,
                                      top: `${Number(path.originY) + cell.row * cellHeight}%`,
                                      width: `${cellWidth}%`,
                                      height: `${cellHeight}%`,
                                    }}
                                    onPointerDown={(event) => beginPathMove(event, bed.id, path.id)}
                                    onPointerMove={(event) => continuePathMove(event, bed.id, path.id)}
                                    onPointerUp={finishPathMove}
                                    onPointerCancel={finishPathMove}
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => {
                                      event.stopPropagation();
                                      if (pathGroup && editingGroupId !== pathGroup.id) deleteGroup(bed.id, pathGroup.id);
                                      else removePaths(bed.id, [path.id]);
                                    }}
                                    aria-label={`Weg mit ${path.cells.length} Rasterfeldern`}
                                  />
                                ));
                              })}
                            </div>

                            {drawingPaths && (
                              <div className="path-draft-layer" aria-hidden="true">
                                {pathDraft.cells.map((cell) => (
                                  <i
                                    key={`${cell.column}:${cell.row}`}
                                    style={{
                                      left: `${(cell.column * pathDraft.cellSizeCm / bedLengthCm) * 100}%`,
                                      top: `${(cell.row * pathDraft.cellSizeCm / bedWidthCm) * 100}%`,
                                      width: `${(pathDraft.cellSizeCm / bedLengthCm) * 100}%`,
                                      height: `${(pathDraft.cellSizeCm / bedWidthCm) * 100}%`,
                                    }}
                                  />
                                ))}
                                {pathDraft.frame && (() => {
                                  const minColumn = Math.min(pathDraft.frame.start.column, pathDraft.frame.current.column);
                                  const maxColumn = Math.max(pathDraft.frame.start.column, pathDraft.frame.current.column);
                                  const minRow = Math.min(pathDraft.frame.start.row, pathDraft.frame.current.row);
                                  const maxRow = Math.max(pathDraft.frame.start.row, pathDraft.frame.current.row);
                                  return <span style={{
                                    left: `${(minColumn * pathDraft.cellSizeCm / bedLengthCm) * 100}%`,
                                    top: `${(minRow * pathDraft.cellSizeCm / bedWidthCm) * 100}%`,
                                    width: `${((maxColumn - minColumn + 1) * pathDraft.cellSizeCm / bedLengthCm) * 100}%`,
                                    height: `${((maxRow - minRow + 1) * pathDraft.cellSizeCm / bedWidthCm) * 100}%`,
                                  }} />;
                                })()}
                              </div>
                            )}

                            {activeBedGroup && (() => {
                              const bounds = getGroupBounds(activeBedGroup, bed.plantings, bed.paths ?? [], state.crops, bed, 2);
                              if (!bounds) return null;
                              return (
                                <>
                                  {bed.showGrid && (
                                    <div
                                      className="group-grid-layer"
                                      style={{
                                        "--grid-x": `${(activeBedGroup.gridSizeCm / bedLengthCm) * 100}%`,
                                        "--grid-y": `${(activeBedGroup.gridSizeCm / bedWidthCm) * 100}%`,
                                        backgroundPosition: `${activeBedGroup.originX}% ${activeBedGroup.originY}%`,
                                        clipPath: `inset(${bounds.top}% ${100 - bounds.right}% ${100 - bounds.bottom}% ${bounds.left}%)`,
                                      }}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <div className="group-outline" style={{ left: `${bounds.left}%`, top: `${bounds.top}%`, width: `${bounds.width}%`, height: `${bounds.height}%` }} aria-hidden="true" />
                                </>
                              );
                            })()}

                            {selectionFrame?.bedId === bed.id && (
                              <div
                                className="selection-frame"
                                style={{
                                  left: `${Math.min(selectionFrame.start.x, selectionFrame.current.x)}%`,
                                  top: `${Math.min(selectionFrame.start.y, selectionFrame.current.y)}%`,
                                  width: `${Math.abs(selectionFrame.current.x - selectionFrame.start.x)}%`,
                                  height: `${Math.abs(selectionFrame.current.y - selectionFrame.start.y)}%`,
                                }}
                                aria-hidden="true"
                              />
                            )}

                            {bed.showSpacing && (
                              <svg className="distance-layer" viewBox={`0 0 ${bedLengthCm} ${bedWidthCm}`} preserveAspectRatio="none" aria-hidden="true">
                                {(bed.plantings || []).map((planting) => {
                                  const crop = state.crops.find((item) => item.id === planting.cropId);
                                  if (!crop) return null;
                                  const isOverlapping = overlapIds.has(planting.id);
                                  const lineOpacity = (100 - state.spacingTransparency) / 100;
                                  return (
                                    <circle
                                      key={planting.id}
                                      cx={(Number(planting.x) / 100) * bedLengthCm}
                                      cy={(Number(planting.y) / 100) * bedWidthCm}
                                      r={Math.max(0.5, Number(crop.spacing) / 2)}
                                      className={`${selectedIds.has(planting.id) || activeGroupPlantingIds.has(planting.id) ? "selected" : ""} ${isOverlapping ? "overlap" : ""}`}
                                      style={{
                                        "--crop": isOverlapping ? "#b84436" : crop.color,
                                        "--line-opacity": lineOpacity,
                                        "--fill-opacity": lineOpacity * 0.18,
                                      }}
                                      vectorEffect="non-scaling-stroke"
                                    />
                                  );
                                })}
                              </svg>
                            )}

                            {(bed.plantings || []).map((planting) => {
                              const crop = state.crops.find((item) => item.id === planting.cropId);
                              const plantingGroup = (bed.groups ?? []).find((group) => getGroupMemberIds(group, "planting").includes(planting.id));
                              if (!crop) return null;
                              return (
                                <button
                                  type="button"
                                  key={planting.id}
                                  className={`plant-instance ${selectedIds.has(planting.id) ? "selected" : ""} ${activeBedGroup && !activeGroupPlantingIds.has(planting.id) ? "inactive" : ""} ${plantingGroup ? "grouped" : ""}`}
                                  style={{ left: `${planting.x}%`, top: `${planting.y}%`, "--crop": crop.color }}
                                  onPointerDown={(event) => beginPlantMove(event, bed.id, planting.id)}
                                  onPointerMove={(event) => continuePlantMove(event, bed.id, planting.id)}
                                  onPointerUp={finishPlantMove}
                                  onPointerCancel={finishPlantMove}
                                  onKeyDown={(event) => nudgePlant(event, bed.id, planting)}
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={(event) => {
                                    event.stopPropagation();
                                    if (plantingGroup && editingGroupId !== plantingGroup.id) deleteGroup(bed.id, plantingGroup.id);
                                    else removePlantings(bed.id, [planting.id]);
                                  }}
                                  aria-label={`${crop.name} bei ${Math.round(planting.x)} Prozent Länge und ${Math.round(planting.y)} Prozent Breite${plantingGroup ? ", gruppiert" : bed.showGrid ? `, im ${bed.gridSizeCm}-Zentimeter-Raster` : ""}${overlapIds.has(planting.id) ? ", Pflanzabstand überschneidet sich" : ""}`}
                                  title={`${crop.name} · ${crop.spacing} cm Pflanzabstand`}
                                >
                                  <span className="plant-marker">{crop.icon}</span>
                                  <span className="plant-name">{crop.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bed-selection" aria-live="polite">
                          {drawingPaths ? (
                            <>
                              <i className="path-symbol">W</i>
                              <span><b>Wege zeichnen</b><small>Rasterfelder anklicken oder mit einem Rahmen markieren. Erneutes Markieren entfernt Felder.</small></span>
                            </>
                          ) : activeBedGroup ? (
                            <>
                              <i className="group-symbol">Gr</i>
                              <span><b>Gruppe mit {activeBedGroup.members.length} Elementen</b><small>{activeGroupPlantingIds.size} Pflanzen · {activeGroupPathIds.size} Wege · {activeBedGroup.gridSizeCm}-cm-Gruppenraster</small></span>
                              <div className="selection-actions">
                                <button type="button" onClick={() => setEditingGroupId((current) => current === activeBedGroup.id ? null : activeBedGroup.id)}>{editingGroupId === activeBedGroup.id ? "Bearbeiten beenden" : "Gruppe bearbeiten"}</button>
                                <button type="button" onClick={() => ungroup(bed.id, activeBedGroup.id)}>Gruppierung lösen</button>
                                <button type="button" className="danger" onClick={() => deleteGroup(bed.id, activeBedGroup.id)}>Gruppe löschen</button>
                              </div>
                            </>
                          ) : selectedItemCount > 1 ? (
                            <>
                              <i className="multi-symbol">{selectedItemCount}</i>
                              <span><b>{selectedItemCount} Elemente ausgewählt</b><small>{bedSelection.plantingIds.length} Pflanzen · {bedSelection.pathIds.length} Wege · gemeinsam verschiebbar</small></span>
                              <div className="selection-actions">
                                <button type="button" disabled={bedSelection.plantingIds.some((id) => groupedIds.has(id)) || bedSelection.pathIds.some((id) => groupedPathIds.has(id))} onClick={() => createGroup(bed.id, bedSelection.plantingIds, bedSelection.pathIds)}>Gruppieren</button>
                                <button type="button" className="danger" onClick={() => setDeleteRequest({ type: "items", bedId: bed.id, plantingIds: bedSelection.plantingIds, pathIds: bedSelection.pathIds, title: `${selectedItemCount} Elemente löschen?`, message: "Die ausgewählten Pflanzen und Wege werden aus dem Beet entfernt." })}>Auswahl löschen</button>
                                <button type="button" onClick={() => setSelection(EMPTY_SELECTION)}>Auswahl aufheben</button>
                              </div>
                            </>
                          ) : primarySelection && selectedCrop ? (
                            <>
                              <i style={{ background: selectedCrop.color }}>{selectedCrop.icon}</i>
                              <span><b>{selectedCrop.name}</b><small>{((primarySelection.x / 100) * Number(bed.length)).toFixed(2)} m längs · {((primarySelection.y / 100) * Number(bed.width)).toFixed(2)} m quer</small></span>
                              <div className="selection-actions">
                                <button type="button" onClick={() => selectCropPlantings(bed.id, selectedCrop.id)}>Alle {selectedCrop.name} markieren</button>
                                <button type="button" onClick={() => groupCropPlantings(bed.id, selectedCrop.id)}>Alle gruppieren</button>
                                <button type="button" className="danger" onClick={() => requestCropPlantingDeletion(bed.id, selectedCrop)}>Alle löschen</button>
                                <button type="button" className="danger" onClick={() => removePlantings(bed.id, [primarySelection.id])}>Pflanze löschen</button>
                              </div>
                            </>
                          ) : primaryPathSelection ? (
                            <>
                              <i className="path-symbol">W</i>
                              <span><b>Weg</b><small>{primaryPathSelection.cells.length} Rasterfelder · {primaryPathSelection.cellSizeCm}-cm-Zeichenraster</small></span>
                              <div className="selection-actions">
                                <button type="button" className="danger" onClick={() => removePaths(bed.id, [primaryPathSelection.id])}>Weg löschen</button>
                              </div>
                            </>
                          ) : (
                            <span className="selection-hint">Freie Fläche aufziehen, um Pflanzen und Wege zu markieren. Strg-Klick erweitert die Auswahl.</span>
                          )}
                          <strong>{(bed.plantings || []).length} Pflanzen · {(bed.paths || []).length} Wege</strong>
                        </div>
                        {(bed.showSpacing || bed.showGrid) && (
                          <p className="distance-note">
                            {bed.showSpacing && "Die gefüllten, gestrichelten Kreise zeigen den empfohlenen Pflanzabstand. Überschneidungen werden beim Verschieben rot markiert. "}
                            {bed.showGrid && `Pflanzen rasten im ${bed.gridSizeCm}-cm-Raster ein.`}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {state.activeTab === "kalender" && (
        <section className="workspace" aria-labelledby="kalender-title">
          <div className="section-heading calendar-heading">
            <div><span className="section-kicker">Jahreslauf</span><h2 id="kalender-title">Pflanz- &amp; Erntekalender</h2></div>
            <div className="calendar-filters">
              <div className="segmented" role="group" aria-label="Kalender filtern">
                {[['all', 'Alle'], ['planted', 'Im Beet'], ['sow', 'Jetzt säen']].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={calendarFilter === value ? "active" : ""}
                    aria-pressed={calendarFilter === value}
                    disabled={value === "planted" && state.beds.length === 0}
                    onClick={() => setCalendarFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {calendarFilter === "planted" && (
                <label className="calendar-bed-filter">
                  <span>Beet</span>
                  <select value={calendarBedId} onChange={(event) => setCalendarBedId(event.target.value)}>
                    <option value="all">Alle Beete</option>
                    {state.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="legend"><span><i className="sow-dot" /> Aussaat &amp; Pflanzung</span><span><i className="harvest-dot" /> Erntefenster</span><span className="today-key"><i /> Aktueller Monat</span></div>
          <div className="calendar-board">
            <div className="calendar-months"><span>Kultur</span>{MONTHS.map((month, index) => <b key={month} className={index + 1 === currentMonth ? "current" : ""}>{month}</b>)}</div>
            {calendarCrops.map((crop) => (
              <div className="calendar-row" key={crop.id}>
                <div className="crop-label"><i style={{ background: crop.color }}>{crop.icon}</i><span>{crop.name}</span></div>
                {MONTHS.map((_, index) => {
                  const month = index + 1;
                  const sow = monthRange(crop.sowStart, crop.sowEnd).includes(month);
                  const harvest = monthRange(crop.harvestStart, crop.harvestEnd).includes(month);
                  return <div key={month} className={`month-cell ${month === currentMonth ? "current" : ""}`} title={`${MONTHS_LONG[index]}: ${sow ? "Aussaat " : ""}${harvest ? "Ernte" : ""}`}><span className={sow ? "sow active" : "sow"} /><span className={harvest ? "harvest active" : "harvest"} /></div>;
                })}
              </div>
            ))}
            {calendarCrops.length === 0 && <div className="calendar-empty">{calendarEmptyMessage}</div>}
          </div>
        </section>
      )}

      {state.activeTab === "kulturen" && (
        <section className="workspace" aria-labelledby="kulturen-title">
          <div className="section-heading cultures-heading">
            <div><span className="section-kicker">Bibliothek</span><h2 id="kulturen-title">Kulturen verwalten</h2></div>
            <label className="search"><span aria-hidden="true">⌕</span><input value={cropSearch} onChange={(e) => setCropSearch(e.target.value)} placeholder="Kultur suchen" /></label>
          </div>
          <div className="cultures-layout">
            <div className="culture-list">
              {filteredCrops.map((crop) => (
                <article className="culture-card" key={crop.id}>
                  <div className="culture-icon" style={{ background: crop.color }}>{crop.icon}</div>
                  <div className="culture-info">
                    <h3>{crop.name}</h3>
                    <p>{crop.note || "Keine Notiz hinterlegt."}</p>
                    <div className="culture-meta"><span>{crop.growingProfile === "greenhouse" ? "Gewächshaus" : "Freiland"}</span><span>Aussaat {MONTHS[crop.sowStart - 1]}–{MONTHS[crop.sowEnd - 1]}</span><span>Ernte {MONTHS[crop.harvestStart - 1]}–{MONTHS[crop.harvestEnd - 1]}</span><span>{crop.spacing} cm Abstand</span></div>
                    <StarRating value={crop.rating} onChange={(rating) => updateCropRating(crop.id, rating)} label={`${crop.name} bewerten`} />
                  </div>
                  <div className="card-actions">
                    <button onClick={() => beginEditCrop(crop)}>Bearbeiten</button>
                    <button
                      className="danger"
                      onClick={() => setDeleteRequest({
                        type: "crop",
                        id: crop.id,
                        title: `Kultur „${crop.name}“ löschen?`,
                        message: "Die Kultur und alle zugehörigen Pflanzungen in den Beeten werden endgültig entfernt.",
                      })}
                    >Löschen</button>
                  </div>
                </article>
              ))}
            </div>
            <form id="kultur-formular" className="crop-form" onSubmit={saveCrop}>
              <div className="form-head"><span className="section-kicker">{editingCrop ? "Änderung" : "Neue Kultur"}</span><h3>{editingCrop ? cropDraft.name : "Eigene Kultur anlegen"}</h3></div>
              <div className="field-pair">
                <label><span>Name</span><input list="culture-profile-suggestions" value={cropDraft.name} onChange={(e) => handleCropNameChange(e.target.value)} placeholder="z. B. Mangold" autoComplete="off" /></label>
                <label className="short-field"><span>Kürzel</span><input maxLength="3" value={cropDraft.icon} onChange={(e) => setCropDraft({ ...cropDraft, icon: e.target.value })} placeholder="Ma" /></label>
              </div>
              <datalist id="culture-profile-suggestions">{CULTURE_PROFILES.map((profile) => <option key={profile.name} value={profile.name} />)}</datalist>
              <div className="growing-mode">
                <span>Anbauart</span>
                <div>
                  <button type="button" className={cropDraft.growingProfile !== "greenhouse" ? "active" : ""} onClick={() => handleGrowingProfileChange("outdoor")}>Freiland</button>
                  <button type="button" className={cropDraft.growingProfile === "greenhouse" ? "active" : ""} onClick={() => handleGrowingProfileChange("greenhouse")}>Gewächshaus</button>
                </div>
              </div>
              <div className={`phase-advice ${phaseStatus.type}`}>
                <div>
                  <b>{phaseStatus.type === "auto" ? "✓ Zeitfenster automatisch bestimmt" : phaseStatus.type === "manual" ? "Manuell angepasst" : phaseStatus.type === "unknown" ? "Kein Kulturprofil erkannt" : phaseStatus.type === "existing" ? "Gespeicherte Zeitfenster" : "Automatische Phasenbestimmung"}</b>
                  <span>{phaseStatus.type === "auto" ? `${phaseStatus.profileName} · ${cropDraft.growingProfile === "greenhouse" ? "Gewächshaus" : "Freiland"}` : phaseStatus.type === "manual" ? "Die automatisch gesetzten Werte wurden individuell verändert." : phaseStatus.type === "unknown" ? "Ein Name aus der Vorschlagsliste kann automatisch ausgewertet werden; die Monatsfelder bleiben frei bearbeitbar." : phaseStatus.type === "existing" ? "Die vorhandenen Werte werden erst nach einer Änderung oder Neuberechnung ersetzt." : `${CULTURE_PROFILES.length} Gemüseprofile stehen für Freiland und Gewächshaus bereit.`}</span>
                </div>
                {(phaseStatus.type === "manual" || phaseStatus.type === "existing") && findCultureProfile(cropDraft.name) && <button type="button" onClick={() => applyCultureProfile(findCultureProfile(cropDraft.name), cropDraft.growingProfile || "outdoor")}>Neu bestimmen</button>}
              </div>
              <label><span>Farbe</span><div className="color-input"><input type="color" value={cropDraft.color} onChange={(e) => setCropDraft({ ...cropDraft, color: e.target.value })} /><code>{cropDraft.color}</code></div></label>
              <div className="month-fields">
                <fieldset><legend>Aussaat</legend><MonthSelect value={cropDraft.sowStart} onChange={(value) => updateManualPhase("sowStart", value)} /><span>bis</span><MonthSelect value={cropDraft.sowEnd} onChange={(value) => updateManualPhase("sowEnd", value)} /></fieldset>
                <fieldset><legend>Ernte</legend><MonthSelect value={cropDraft.harvestStart} onChange={(value) => updateManualPhase("harvestStart", value)} /><span>bis</span><MonthSelect value={cropDraft.harvestEnd} onChange={(value) => updateManualPhase("harvestEnd", value)} /></fieldset>
              </div>
              <p className="phase-note">Richtwerte für ein gemäßigtes mitteleuropäisches Klima. Sorte, Frostlage und aktuelles Wetter können Abweichungen erfordern.</p>
              <label><span>Pflanzabstand (cm)</span><input type="number" min="1" value={cropDraft.spacing} onChange={(e) => setCropDraft({ ...cropDraft, spacing: e.target.value })} /></label>
              <label className="rating-field"><span>Bewertung</span><StarRating value={normalizeRating(cropDraft.rating)} onChange={(rating) => setCropDraft({ ...cropDraft, rating })} label="Bewertung der Kultur" /></label>
              <label><span>Notiz</span><textarea rows="3" value={cropDraft.note} onChange={(e) => setCropDraft({ ...cropDraft, note: e.target.value })} placeholder="Standort, Pflege oder Besonderheiten" /></label>
              <div className="form-buttons">
                {editingCrop && <button type="button" className="button ghost" onClick={() => { setEditingCrop(null); setCropDraft(EMPTY_CROP); setPhaseStatus({ type: "idle" }); }}>Abbrechen</button>}
                <button type="submit" className="button primary">{editingCrop ? "Änderungen speichern" : "Kultur hinzufügen"}</button>
              </div>
            </form>
          </div>
        </section>
      )}

      <footer><span>Mein Gemüsegarten</span><p>Alle Daten bleiben in diesem Browser gespeichert.</p><span>Version 1.2</span></footer>
      {notice && <div className="toast" role="status">✓ {notice}</div>}
      {undoState && <div className="toast undo-toast" role="status"><span>{undoState.message}</span><button type="button" onClick={restoreLastRemoval}>Rückgängig</button></div>}
      <ConfirmDialog request={deleteRequest} onCancel={() => setDeleteRequest(null)} onConfirm={confirmDeletion} />
    </main>
  );
}
