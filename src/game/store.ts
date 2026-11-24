import { create } from 'zustand';
import {
  CAREER_BY_ID, ASPIRATION_BY_ID, FLOOR_ORDER, INTERACTIONS, OBJECT_BY_ID, TRAIT_BY_ID, getDef,
} from './data';
import {
  FLOOR_STYLES, LOT_D, LOT_W, MAX_SIMS, WALL_STYLES, clamp, deepCopy,
  formatMoney, isInsideLot, isPoolTile, seasonFromDay, tileKey, uid, wallKey,
} from './constants';
import {
  canPlaceObject, createInitialLot, createInitialSims, createSim, cloneAppearance,
  findObject, wallMaterialCost,
} from './lot';
import { findPathForMove, prepareInteraction, beginWork, simulate, checkAchievements, type SimEvent } from './simulation';
import type { Tile } from './pathfinding';
import { audio } from './engine/audio';
import { SAVE_VERSION } from './types';
import type {
  ActivityType, Appearance, BuildState, BuildTool, CameraPreset, FloorStyleId, GameMode,
  GameState, Lot, Room, SaveSlot, Settings, Sim, Speed, UIState, Wall, WallKind, WallStyleId,
  WorldSnapshot, FurnitureObject,
} from './types';

const AUTOSAVE_KEY = 'aurora:autosave:v3';
const SLOTS_KEY = 'aurora:slots:v3';
const SETTINGS_KEY = 'aurora:settings:v3';

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  shadows: true,
  quality: 'high',
  showGrid: true,
  showRoof: false,
  showLabels: true,
  autosave: true,
  minutesPerSecond: 2,
};

export interface CASPayload {
  id?: string;
  name: string;
  pronoun: Sim['pronoun'];
  appearance: Appearance;
  traits: string[];
  aspirationId: string;
}

export interface WallEdge { axis: 'h' | 'v'; x: number; z: number }
export type ModalKey = 'showSaves' | 'showSettings' | 'showHelp' | 'showAchievements' | 'showCareers';

function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota cheia */ }
}

function readSettings(): Partial<Settings> {
  return readJSON<Partial<Settings>>(SETTINGS_KEY) ?? {};
}

function persistSettings(settings: Settings) {
  writeJSON(SETTINGS_KEY, settings);
}

function readSlots(): Array<SaveSlot | null> {
  const parsed = readJSON<Array<SaveSlot | null>>(SLOTS_KEY);
  if (!Array.isArray(parsed)) return [null, null, null];
  return [0, 1, 2].map((i) => parsed[i] ?? null);
}

function writeSlots(slots: Array<SaveSlot | null>) {
  writeJSON(SLOTS_KEY, slots);
}

function readAutosave(): WorldSnapshot | null {
  return readJSON<WorldSnapshot>(AUTOSAVE_KEY);
}

export function hasAutosave() {
  return !!readAutosave();
}

export function getAutosaveInfo() {
  const snap = readAutosave();
  if (!snap) return null;
  return {
    householdName: snap.householdName,
    day: snap.clock?.day ?? 1,
    minute: snap.clock?.minutes ?? 0,
    money: snap.money ?? 0,
    timestamp: snap.timestamp ?? 0,
    simCount: snap.sims?.length ?? 0,
  };
}

export function getSlots() {
  return readSlots();
}

function initialState(): GameState {
  const lot = createInitialLot();
  const sims = createInitialSims();
  return {
    version: SAVE_VERSION,
    started: false,
    householdName: 'Família Aurora',
    mode: 'live',
    speed: 1,
    clock: { day: 1, minutes: 8 * 60 + 20, season: 'spring' },
    weather: 'clear',
    weatherMinutes: 260,
    money: 12500,
    lot,
    sims,
    activeSimId: sims[0].id,
    selectedObjectId: null,
    hoverTile: null,
    build: {
      tool: 'select', selectedDefId: 'sofa', selectedObjectId: null, rotation: 0,
      floorStyle: 'wood', wallStyle: 'stucco', wallKind: 'wall', brushSize: 1,
      strokeActive: false, roomStart: null, roomEnd: null,
    },
    ui: {
      showSplash: true, showCAS: false, casTargetId: null, showSaves: false,
      showSettings: false, showHelp: false, showAchievements: false, showCareers: false,
      photoMode: false, tutorialStep: 0, toasts: [], log: [], cameraPreset: 'overview',
      cameraNonce: 0, focusSimId: null, focusNonce: 0,
    },
    settings: { ...DEFAULT_SETTINGS, ...readSettings() },
    achievements: [],
    stats: {
      meals: 0, interactions: 0, objectsPlaced: 0, wallsPlaced: 0, promotions: 0,
      skillUps: 0, daysPlayed: 0, earned: 0, spent: 0,
    },
    lastBillDay: 0,
    lastAutosaveAt: Date.now(),
    history: [],
    future: [],
  };
}

function snapshotFromState(state: GameState): WorldSnapshot {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    householdName: state.householdName,
    mode: state.mode,
    speed: state.speed,
    clock: deepCopy(state.clock),
    weather: state.weather,
    weatherMinutes: state.weatherMinutes,
    money: state.money,
    lot: deepCopy(state.lot),
    sims: deepCopy(state.sims),
    activeSimId: state.activeSimId,
    settings: deepCopy(state.settings),
    achievements: [...state.achievements],
    stats: deepCopy(state.stats),
    lastBillDay: state.lastBillDay,
  };
}

function normalizeSim(raw: Partial<Sim> & { name?: string }): Sim {
  const base = createSim({ id: raw.id, name: raw.name?.trim() || 'Morador' });
  const needs = { ...base.needs };
  const skills = { ...base.skills };
  const skillXp = { ...base.skillXp };
  (Object.keys(needs) as Array<keyof typeof needs>).forEach((key) => {
    const value = Number(raw.needs?.[key]);
    if (Number.isFinite(value)) needs[key] = clamp(value, 0, 100);
  });
  (Object.keys(skills) as Array<keyof typeof skills>).forEach((key) => {
    const value = Number(raw.skills?.[key]);
    if (Number.isFinite(value)) skills[key] = clamp(Math.round(value), 1, 10);
    const xp = Number(raw.skillXp?.[key]);
    if (Number.isFinite(xp)) skillXp[key] = Math.max(0, xp);
  });
  const job = raw.job ? {
    careerId: CAREER_BY_ID[raw.job.careerId] ? raw.job.careerId : 'tech',
    level: clamp(Number(raw.job.level) || 1, 1, 5),
    shiftStart: Number(raw.job.shiftStart) || 540,
    shiftEnd: Number(raw.job.shiftEnd) || 1020,
    lastWorkDay: Number(raw.job.lastWorkDay) || 0,
    performance: clamp(Number(raw.job.performance) || 70, 0, 100),
  } : null;
  return {
    ...base,
    pronoun: raw.pronoun ?? base.pronoun,
    appearance: cloneAppearance(raw.appearance),
    traits: Array.isArray(raw.traits) ? raw.traits.filter((id) => TRAIT_BY_ID[id]).slice(0, 3) : base.traits,
    aspirationId: ASPIRATION_BY_ID[raw.aspirationId ?? ''] ? raw.aspirationId! : base.aspirationId,
    aspirationDone: !!raw.aspirationDone,
    needs, skills, skillXp,
    mood: clamp(Number(raw.mood) || base.mood, 0, 100),
    job,
    position: raw.position ? { x: clamp(Number(raw.position.x) || 8, 0, LOT_W - 1), z: clamp(Number(raw.position.z) || 8, 0, LOT_D - 1) } : base.position,
    facing: Number(raw.facing) || 0,
    path: Array.isArray(raw.path) ? raw.path : [],
    pathIndex: Number(raw.pathIndex) || 0,
    pending: raw.pending,
    activity: raw.activity ?? null,
    relationships: raw.relationships ?? {},
    counters: raw.counters ?? {},
    atWork: !!raw.atWork,
    autonomyCooldown: Number(raw.autonomyCooldown) || 6,
  };
}

function normalizeLot(raw: Partial<Lot>): Lot {
  const floors: Record<string, FloorStyleId> = {};
  Object.entries(raw.floors ?? {}).forEach(([key, style]) => {
    if (FLOOR_STYLES[style as FloorStyleId]) floors[key] = style as FloorStyleId;
  });
  const walls: Record<string, Wall> = {};
  Object.entries(raw.walls ?? {}).forEach(([key, value]) => {
    const wall = value as Partial<Wall>;
    if (!wall || !wall.axis || wall.axis !== 'h' && wall.axis !== 'v') return;
    const x = Number(wall.x); const z = Number(wall.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const axis = wall.axis as 'h' | 'v';
    const kind = (['wall', 'door', 'window'].includes(wall.kind ?? '') ? wall.kind : 'wall') as WallKind;
    const style = (WALL_STYLES[wall.style as WallStyleId] ? wall.style : 'stucco') as WallStyleId;
    const realKey = wallKey(axis, x, z);
    walls[realKey] = { id: wall.id || uid('wall'), key: realKey, x, z, axis, kind, style };
  });
  const objects: FurnitureObject[] = (Array.isArray(raw.objects) ? raw.objects : [])
    .filter((o) => o && OBJECT_BY_ID[o.defId])
    .map((o) => ({
      id: o.id || uid('obj'), defId: o.defId,
      x: clamp(Math.round(Number(o.x) || 0), 0, LOT_W - 1),
      z: clamp(Math.round(Number(o.z) || 0), 0, LOT_D - 1),
      rotation: clamp(Math.round(Number(o.rotation) || 0), 0, 3) as 0 | 1 | 2 | 3,
      color: o.color, variant: Number(o.variant) || 0,
    }));
  const rooms: Room[] = (Array.isArray(raw.rooms) ? raw.rooms : []).map((r) => ({
    id: r.id || uid('room'), name: r.name || 'Cômodo', x: Number(r.x) || 0, z: Number(r.z) || 0,
    w: Number(r.w) || 1, d: Number(r.d) || 1,
    floor: FLOOR_STYLES[r.floor] ? r.floor : 'wood',
  }));
  return { width: LOT_W, depth: LOT_D, floors, walls, objects, rooms };
}

function hydrateSnapshot(snapshot: WorldSnapshot): Partial<GameState> {
  const base = initialState();
  const sims = (Array.isArray(snapshot.sims) ? snapshot.sims : []).map(normalizeSim);
  const safeSims = sims.length ? sims : createInitialSims();
  const activeSimId = safeSims.some((s) => s.id === snapshot.activeSimId) ? snapshot.activeSimId : safeSims[0].id;
  const day = Number(snapshot.clock?.day) || 1;
  return {
    version: SAVE_VERSION,
    started: true,
    householdName: snapshot.householdName || base.householdName,
    mode: snapshot.mode === 'build' ? 'build' : 'live',
    speed: ([0, 1, 2, 4].includes(snapshot.speed) ? snapshot.speed : 1) as Speed,
    clock: {
      day,
      minutes: clamp(Number(snapshot.clock?.minutes) || 480, 0, 1439),
      season: seasonFromDay(day),
    },
    weather: snapshot.weather ?? 'clear',
    weatherMinutes: Number(snapshot.weatherMinutes) || 220,
    money: Number(snapshot.money) || 12500,
    lot: snapshot.lot ? normalizeLot(snapshot.lot) : createInitialLot(),
    sims: safeSims,
    activeSimId,
    selectedObjectId: null,
    hoverTile: null,
    build: { ...base.build },
    ui: {
      ...base.ui, showSplash: false, showCAS: false, casTargetId: null, showSaves: false,
      showSettings: false, showHelp: false, showAchievements: false, showCareers: false,
      photoMode: false, tutorialStep: -1, cameraNonce: base.ui.cameraNonce + 1,
    },
    settings: { ...base.settings, ...(snapshot.settings ?? {}) },
    achievements: Array.isArray(snapshot.achievements) ? [...snapshot.achievements] : [],
    stats: { ...base.stats, ...(snapshot.stats ?? {}) },
    lastBillDay: Number(snapshot.lastBillDay) || 0,
    lastAutosaveAt: Date.now(),
    history: [],
    future: [],
  };
}

export interface GameActions {
  advance(dtReal: number): void;
  notify(title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error', icon?: string): void;
  dismissToast(id: string): void;
  refreshAchievements(): void;
  setMode(mode: GameMode): void;
  setSpeed(speed: Speed): void;
  togglePause(): void;
  setSettings(patch: Partial<Settings>): void;
  setUI(patch: Partial<UIState>): void;
  openModal(modal: ModalKey): void;
  closeModals(): void;
  openCAS(simId?: string | null): void;
  setTutorialStep(step: number): void;
  togglePhotoMode(): void;
  requestScreenshot(): void;
  setCameraPreset(preset: CameraPreset): void;
  focusSim(id: string | null): void;
  setHouseholdName(name: string): void;
  setActiveSim(id: string): void;
  selectObject(id: string | null): void;
  setHoverTile(tile: { x: number; z: number } | null): void;
  setBuild(patch: Partial<BuildState>): void;
  setBuildTool(tool: BuildTool): void;
  selectCatalogItem(defId: string): void;
  setRotation(rotation: 0 | 1 | 2 | 3): void;
  rotatePlacement(): void;
  setFloorStyle(style: FloorStyleId): void;
  setWallStyle(style: WallStyleId): void;
  setWallKind(kind: WallKind | 'erase'): void;
  setBrushSize(size: 1 | 2 | 3): void;
  startStroke(): void;
  endStroke(): void;
  paintFloor(x: number, z: number): void;
  paintWall(edge: WallEdge): void;
  createRoom(x0: number, z0: number, x1: number, z1: number): void;
  placeObject(x: number, z: number, rotation?: 0 | 1 | 2 | 3, defId?: string): void;
  moveObject(id: string, x: number, z: number, rotation?: 0 | 1 | 2 | 3): void;
  removeObject(id: string): void;
  duplicateObject(id: string): void;
  setObjectColor(id: string, color: string): void;
  undo(): void;
  redo(): void;
  commandMove(tile: Tile): void;
  startInteraction(simId: string, interactionId: ActivityType, targetId?: string, targetSimId?: string): void;
  cancelActivity(simId: string): void;
  assignJob(simId: string, careerId: string): void;
  quitJob(simId: string): void;
  goToWork(simId: string): void;
  saveCAS(payload: CASPayload): void;
  removeSim(simId: string): void;
  saveToSlot(index: number, label?: string): void;
  loadFromSlot(index: number): void;
  deleteSlot(index: number): void;
  downloadSave(): void;
  exportSave(): string;
  importSave(text: string): boolean;
  autosave(): void;
  continueGame(): void;
  startNewGame(): void;
  newGame(): void;
}

export type GameStore = GameState & GameActions;

let simAccumulator = 0;
let lastNonZeroSpeed: Speed = 1;
let lastAudioEnv = '';
let lastFundWarning = 0;
let lastBuildSound = 0;

function throttledBuildSound(kind: 'place' | 'delete') {
  const now = Date.now();
  if (now - lastBuildSound < 130) return;
  lastBuildSound = now;
  audio.play(kind);
}

export const useGameStore = create<GameStore>()((set, get) => {
  const emit = (events: SimEvent[]) => {
    events.forEach((evt) => {
      get().notify(evt.title, evt.message, evt.tone, evt.icon);
      if (evt.sound) audio.play(evt.sound);
    });
  };

  const pushHistory = () => set((s) => ({
    history: [...s.history.slice(-39), { lot: deepCopy(s.lot), money: s.money }],
    future: [],
  }));

  const warnFunds = (message: string) => {
    const now = Date.now();
    if (now - lastFundWarning < 2500) return;
    lastFundWarning = now;
    get().notify('Saldo insuficiente', message, 'warning', '💸');
    audio.play('error');
  };

  return {
    ...initialState(),

    advance(dtReal) {
      const state = get();
      const paused = !state.started || state.speed === 0 || state.mode === 'build'
        || state.ui.showSplash || state.ui.showCAS || state.ui.showSaves || state.ui.showSettings
        || state.ui.showHelp || state.ui.showAchievements || state.ui.showCareers;

      if (paused) {
        simAccumulator = 0;
      } else {
        simAccumulator += Math.min(dtReal, 0.12);
        let steps = 0;
        while (simAccumulator >= 0.1 && steps < 5) {
          simAccumulator -= 0.1;
          const { patch, events } = simulate(get(), 0.1);
          set(patch);
          emit(events);
          steps += 1;
        }
      }

      const current = get();
      const night = current.clock.minutes < 360 || current.clock.minutes > 1140;
      const envKey = `${current.weather}|${night}`;
      if (envKey !== lastAudioEnv) {
        lastAudioEnv = envKey;
        audio.setEnvironment(current.weather, night);
      }
      if (!paused && current.settings.autosave && Date.now() - current.lastAutosaveAt > 60000) {
        get().autosave();
      }
    },

    notify(title, message, tone = 'info', icon = '✨') {
      const id = uid('toast');
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      set((s) => ({
        ui: {
          ...s.ui,
          toasts: [...s.ui.toasts.slice(-3), { id, title, message, tone, icon, createdAt: Date.now() }],
          log: [`${time} · ${title}: ${message}`, ...s.ui.log].slice(0, 80),
        },
      }));
      if (typeof window !== 'undefined') {
        window.setTimeout(() => get().dismissToast(id), 5200);
      }
    },

    dismissToast(id) {
      set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } }));
    },

    refreshAchievements() {
      const state = get();
      const result = checkAchievements(state, state.achievements);
      if (result.achievements.length > state.achievements.length) {
        set({ achievements: result.achievements });
        emit(result.events);
      }
    },

    setMode(mode) {
      set((s) => ({ mode, build: { ...s.build, roomStart: null, roomEnd: null, strokeActive: false } }));
      audio.play('ui');
    },

    setSpeed(speed) {
      if (speed > 0) lastNonZeroSpeed = speed;
      set({ speed });
      audio.play('ui');
    },

    togglePause() {
      const speed = get().speed;
      get().setSpeed(speed === 0 ? lastNonZeroSpeed : 0);
    },

    setSettings(patch) {
      const next = { ...get().settings, ...patch };
      persistSettings(next);
      if (next.sound) audio.unlock();
      audio.setEnabled(next.sound);
      set({ settings: next });
      audio.play('ui');
    },

    setUI(patch) {
      set((s) => ({ ui: { ...s.ui, ...patch } }));
    },

    openModal(modal) {
      const patch: Partial<UIState> = {};
      if (modal === 'showSaves') patch.showSaves = true;
      if (modal === 'showSettings') patch.showSettings = true;
      if (modal === 'showHelp') patch.showHelp = true;
      if (modal === 'showAchievements') patch.showAchievements = true;
      if (modal === 'showCareers') patch.showCareers = true;
      set((s) => ({ ui: { ...s.ui, ...patch } }));
      audio.play('ui');
    },

    closeModals() {
      set((s) => ({
        ui: {
          ...s.ui, showCAS: false, casTargetId: null, showSaves: false, showSettings: false,
          showHelp: false, showAchievements: false, showCareers: false,
        },
      }));
      audio.play('ui');
    },

    openCAS(simId = null) {
      set((s) => ({ ui: { ...s.ui, showCAS: true, casTargetId: simId } }));
      audio.play('ui');
    },

    setTutorialStep(step) {
      set((s) => ({ ui: { ...s.ui, tutorialStep: step } }));
    },

    togglePhotoMode() {
      set((s) => ({ ui: { ...s.ui, photoMode: !s.ui.photoMode } }));
      audio.play('ui');
    },

    requestScreenshot() {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aurora:screenshot'));
      audio.play('ui');
    },

    setCameraPreset(preset) {
      set((s) => ({ ui: { ...s.ui, cameraPreset: preset, cameraNonce: s.ui.cameraNonce + 1 } }));
      audio.play('ui');
    },

    focusSim(id) {
      set((s) => ({
        ui: {
          ...s.ui, focusSimId: id, focusNonce: s.ui.focusNonce + 1,
          ...(id ? { cameraPreset: 'cinema' as CameraPreset, cameraNonce: s.ui.cameraNonce + 1 } : {}),
        },
        ...(id ? { activeSimId: id } : {}),
      }));
      audio.play('ui');
    },

    setHouseholdName(name) {
      set({ householdName: name.slice(0, 32) });
    },

    setActiveSim(id) {
      set({ activeSimId: id, selectedObjectId: null });
      audio.play('ui');
    },

    selectObject(id) {
      set((s) => ({
        selectedObjectId: id,
        build: { ...s.build, selectedObjectId: id, tool: s.mode === 'build' ? 'select' : s.build.tool },
      }));
      audio.play('ui');
    },

    setHoverTile(tile) {
      set({ hoverTile: tile });
    },

    setBuild(patch) {
      set((s) => ({
        build: { ...s.build, ...patch },
        ...(patch.selectedObjectId !== undefined ? { selectedObjectId: patch.selectedObjectId as string | null } : {}),
      }));
    },

    setBuildTool(tool) {
      set((s) => ({
        build: {
          ...s.build, tool,
          selectedDefId: s.build.selectedDefId ?? 'sofa',
          roomStart: null, roomEnd: null,
        },
        selectedObjectId: tool === 'select' ? s.selectedObjectId : null,
      }));
      audio.play('ui');
    },

    selectCatalogItem(defId) {
      if (!OBJECT_BY_ID[defId]) return;
      set((s) => ({
        build: { ...s.build, tool: 'place', selectedDefId: defId, selectedObjectId: null, rotation: 0 },
        selectedObjectId: null,
      }));
      audio.play('ui');
    },

    setRotation(rotation) {
      set((s) => ({ build: { ...s.build, rotation } }));
      audio.play('ui');
    },

    rotatePlacement() {
      const state = get();
      const next = ((state.build.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      const selectedId = state.build.selectedObjectId ?? state.selectedObjectId;
      if (state.mode === 'build' && selectedId && (state.build.tool === 'move' || state.build.tool === 'select')) {
        const object = findObject(state.lot, selectedId);
        if (object) get().moveObject(selectedId, object.x, object.z, next);
      } else {
        get().setRotation(next);
      }
      audio.play('ui');
    },

    setFloorStyle(style) {
      set((s) => ({ build: { ...s.build, floorStyle: style, tool: 'floor' } }));
      audio.play('ui');
    },

    setWallStyle(style) {
      set((s) => ({ build: { ...s.build, wallStyle: style, tool: 'wall' } }));
      audio.play('ui');
    },

    setWallKind(kind) {
      set((s) => ({ build: { ...s.build, wallKind: kind, tool: 'wall' } }));
      audio.play('ui');
    },

    setBrushSize(size) {
      set((s) => ({ build: { ...s.build, brushSize: size } }));
      audio.play('ui');
    },

    startStroke() {
      pushHistory();
      set((s) => ({ build: { ...s.build, strokeActive: true } }));
    },

    endStroke() {
      set((s) => ({ build: { ...s.build, strokeActive: false, roomStart: null, roomEnd: null } }));
    },

    paintFloor(x, z) {
      const state = get();
      const style = state.build.floorStyle;
      if (style === 'water') return;
      const brush = state.build.brushSize;
      const half = Math.floor((brush - 1) / 2);
      const tiles: Array<{ x: number; z: number }> = [];
      for (let dx = -half; dx <= brush - 1 - half; dx += 1) {
        for (let dz = -half; dz <= brush - 1 - half; dz += 1) {
          const tx = x + dx; const tz = z + dz;
          if (!isInsideLot(tx, tz) || isPoolTile(tx, tz)) continue;
          if (state.lot.floors[tileKey(tx, tz)] === style) continue;
          tiles.push({ x: tx, z: tz });
        }
      }
      if (!tiles.length) return;
      const cost = tiles.length * (FLOOR_STYLES[style]?.price ?? 0);
      if (state.money < cost) { warnFunds(`Faltam ${formatMoney(cost - state.money)} para aplicar este piso.`); return; }
      set((s) => {
        const floors = { ...s.lot.floors };
        tiles.forEach((tile) => { floors[tileKey(tile.x, tile.z)] = style; });
        return {
          lot: { ...s.lot, floors },
          money: s.money - cost,
          stats: { ...s.stats, spent: s.stats.spent + cost },
        };
      });
    },

    paintWall(edge) {
      const state = get();
      const { axis, x, z } = edge;
      if (axis === 'h' && (x < 0 || x >= LOT_W || z < 0 || z > LOT_D)) return;
      if (axis === 'v' && (x < 0 || x > LOT_W || z < 0 || z >= LOT_D)) return;
      const key = wallKey(axis, x, z);
      const walls = { ...state.lot.walls };
      const existing = walls[key];
      const kind = state.build.wallKind;
      const style = state.build.wallStyle;

      if (kind === 'erase') {
        if (!existing) return;
        const refund = Math.round(wallMaterialCost(existing.kind, existing.style) * 0.4);
        delete walls[key];
        set((s) => ({ lot: { ...s.lot, walls }, money: s.money + refund }));
        throttledBuildSound('delete');
        return;
      }

      if (existing && existing.kind === kind && existing.style === style) return;
      const baseCost = wallMaterialCost(kind, style);
      const cost = existing ? Math.max(20, baseCost - Math.round(wallMaterialCost(existing.kind, existing.style) * 0.5)) : baseCost;
      if (state.money < cost) { warnFunds(`Faltam ${formatMoney(cost - state.money)} para esta parede.`); return; }
      walls[key] = { id: existing?.id ?? uid('wall'), key, x, z, axis, kind, style };
      set((s) => ({
        lot: { ...s.lot, walls },
        money: s.money - cost,
        stats: { ...s.stats, spent: s.stats.spent + cost, wallsPlaced: s.stats.wallsPlaced + (existing ? 0 : 1) },
      }));
      throttledBuildSound('place');
      get().refreshAchievements();
    },

    createRoom(x0, z0, x1, z1) {
      const state = get();
      const ax = clamp(Math.min(x0, x1), 0, LOT_W - 1);
      const az = clamp(Math.min(z0, z1), 0, LOT_D - 1);
      const bx = clamp(Math.max(x0, x1), 0, LOT_W - 1);
      const bz = clamp(Math.max(z0, z1), 0, LOT_D - 1);
      const w = bx - ax + 1;
      const d = bz - az + 1;
      if (w < 2 || d < 2) {
        get().notify('Cômodo muito pequeno', 'Selecione pelo menos 2×2 tiles.', 'warning', '📐');
        audio.play('error');
        return;
      }
      for (let x = ax; x <= bx; x += 1) {
        for (let z = az; z <= bz; z += 1) {
          if (isPoolTile(x, z)) {
            get().notify('Área inválida', 'Não é possível construir sobre a piscina.', 'warning', '🌊');
            audio.play('error');
            return;
          }
        }
      }
      const floorStyle = state.build.floorStyle === 'water' ? 'wood' : state.build.floorStyle;
      const wallStyle = state.build.wallStyle;
      const area = w * d;
      const perimeter = w * 2 + d * 2;
      const cost = Math.round(area * (FLOOR_STYLES[floorStyle]?.price ?? 20) + perimeter * (WALL_STYLES[wallStyle]?.price ?? 90) + 320);
      if (state.money < cost) { warnFunds(`Faltam ${formatMoney(cost - state.money)} para criar o cômodo.`); return; }
      pushHistory();
      const floors = { ...state.lot.floors };
      const walls = { ...state.lot.walls };
      for (let x = ax; x <= bx; x += 1) {
        for (let z = az; z <= bz; z += 1) floors[tileKey(x, z)] = floorStyle;
      }
      const doorX = ax + Math.floor(w / 2);
      for (let x = ax; x <= bx; x += 1) {
        [['h', x, az], ['h', x, bz + 1]].forEach(([a, xx, zz]) => {
          const axis = a as 'h' | 'v'; const wx = xx as number; const wz = zz as number;
          const key = wallKey(axis, wx, wz);
          const kind: WallKind = axis === 'h' && wx === doorX && wz === bz + 1 ? 'door' : 'wall';
          walls[key] = { id: uid('wall'), key, x: wx, z: wz, axis, kind, style: wallStyle };
        });
      }
      for (let z = az; z <= bz; z += 1) {
        [['v', ax, z], ['v', bx + 1, z]].forEach(([a, xx, zz]) => {
          const axis = a as 'h' | 'v'; const wx = xx as number; const wz = zz as number;
          const key = wallKey(axis, wx, wz);
          walls[key] = { id: uid('wall'), key, x: wx, z: wz, axis, kind: 'wall', style: wallStyle };
        });
      }
      const room: Room = { id: uid('room'), name: `Cômodo ${state.lot.rooms.length + 1}`, x: ax, z: az, w, d, floor: floorStyle };
      set((s) => ({
        lot: { ...s.lot, floors, walls, rooms: [...s.lot.rooms, room] },
        money: s.money - cost,
        stats: { ...s.stats, spent: s.stats.spent + cost, wallsPlaced: s.stats.wallsPlaced + perimeter },
        build: { ...s.build, roomStart: null, roomEnd: null, strokeActive: false },
      }));
      get().notify('Novo cômodo', `${room.name} criado com ${area} tiles por ${formatMoney(cost)}.`, 'success', '🏗️');
      audio.play('success');
      get().refreshAchievements();
    },

    placeObject(x, z, rotation, defId) {
      const state = get();
      const id = defId ?? state.build.selectedDefId;
      if (!id || !OBJECT_BY_ID[id]) return;
      const rot = (rotation ?? state.build.rotation) as 0 | 1 | 2 | 3;
      const def = OBJECT_BY_ID[id];
      const check = canPlaceObject(state.lot, id, x, z, rot);
      if (!check.ok) {
        get().notify('Não foi possível colocar', check.reason ?? 'Espaço inválido.', 'warning', '📦');
        audio.play('error');
        return;
      }
      if (state.money < def.price) { warnFunds(`Faltam ${formatMoney(def.price - state.money)} para comprar ${def.name}.`); return; }
      pushHistory();
      const object: FurnitureObject = { id: uid('obj'), defId: id, x, z, rotation: rot, color: def.defaultColor, variant: Math.floor(Math.random() * 4) };
      set((s) => ({
        lot: { ...s.lot, objects: [...s.lot.objects, object] },
        money: s.money - def.price,
        stats: { ...s.stats, objectsPlaced: s.stats.objectsPlaced + 1, spent: s.stats.spent + def.price },
        selectedObjectId: object.id,
        build: { ...s.build, selectedObjectId: object.id },
      }));
      audio.play('place');
      get().refreshAchievements();
    },

    moveObject(id, x, z, rotation) {
      const state = get();
      const object = findObject(state.lot, id);
      if (!object) return;
      const rot = (rotation ?? object.rotation) as 0 | 1 | 2 | 3;
      const check = canPlaceObject(state.lot, object.defId, x, z, rot, id);
      if (!check.ok) {
        get().notify('Não foi possível mover', check.reason ?? 'Espaço inválido.', 'warning', '↔️');
        audio.play('error');
        return;
      }
      pushHistory();
      set((s) => ({
        lot: { ...s.lot, objects: s.lot.objects.map((o) => (o.id === id ? { ...o, x, z, rotation: rot } : o)) },
      }));
      audio.play('ui');
    },

    removeObject(id) {
      const state = get();
      const object = findObject(state.lot, id);
      if (!object) return;
      const refund = Math.round(getDef(object.defId).price * 0.7);
      pushHistory();
      set((s) => ({
        lot: { ...s.lot, objects: s.lot.objects.filter((o) => o.id !== id) },
        money: s.money + refund,
        selectedObjectId: null,
        build: { ...s.build, selectedObjectId: null },
      }));
      audio.play('delete');
      get().notify('Objeto vendido', `Você recebeu ${formatMoney(refund)} de volta.`, 'info', '💸');
    },

    duplicateObject(id) {
      const state = get();
      const original = findObject(state.lot, id);
      if (!original) return;
      const def = getDef(original.defId);
      if (state.money < def.price) { warnFunds(`Faltam ${formatMoney(def.price - state.money)} para duplicar.`); return; }
      let spot: { x: number; z: number } | null = null;
      for (let r = 1; r <= 5 && !spot; r += 1) {
        for (let dx = -r; dx <= r && !spot; dx += 1) {
          for (let dz = -r; dz <= r && !spot; dz += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const x = original.x + dx; const z = original.z + dz;
            if (canPlaceObject(state.lot, original.defId, x, z, original.rotation).ok) spot = { x, z };
          }
        }
      }
      if (!spot) {
        get().notify('Sem espaço', 'Não há um tile livre por perto.', 'warning', '📦');
        audio.play('error');
        return;
      }
      pushHistory();
      const copy: FurnitureObject = { ...original, id: uid('obj'), x: spot.x, z: spot.z };
      set((s) => ({
        lot: { ...s.lot, objects: [...s.lot.objects, copy] },
        money: s.money - def.price,
        stats: { ...s.stats, objectsPlaced: s.stats.objectsPlaced + 1, spent: s.stats.spent + def.price },
        selectedObjectId: copy.id,
        build: { ...s.build, selectedObjectId: copy.id },
      }));
      audio.play('place');
      get().notify('Objeto duplicado', `${def.name} adicionado por ${formatMoney(def.price)}.`, 'success', '📋');
      get().refreshAchievements();
    },

    setObjectColor(id, color) {
      const object = findObject(get().lot, id);
      if (!object) return;
      pushHistory();
      set((s) => ({ lot: { ...s.lot, objects: s.lot.objects.map((o) => (o.id === id ? { ...o, color } : o)) } }));
      audio.play('ui');
    },

    undo() {
      const state = get();
      if (!state.history.length) {
        get().notify('Nada para desfazer', 'O histórico de construção está vazio.', 'info', '↩️');
        return;
      }
      const snapshot = state.history[state.history.length - 1];
      set((s) => ({
        lot: deepCopy(snapshot.lot),
        money: snapshot.money,
        history: s.history.slice(0, -1),
        future: [...s.future, { lot: deepCopy(s.lot), money: s.money }],
        selectedObjectId: null,
        build: { ...s.build, selectedObjectId: null },
      }));
      audio.play('ui');
    },

    redo() {
      const state = get();
      if (!state.future.length) {
        get().notify('Nada para refazer', 'Não há ações futuras.', 'info', '↪️');
        return;
      }
      const snapshot = state.future[state.future.length - 1];
      set((s) => ({
        lot: deepCopy(snapshot.lot),
        money: snapshot.money,
        future: s.future.slice(0, -1),
        history: [...s.history, { lot: deepCopy(s.lot), money: s.money }],
        selectedObjectId: null,
        build: { ...s.build, selectedObjectId: null },
      }));
      audio.play('ui');
    },

    commandMove(tile) {
      const state = get();
      const sim = state.sims.find((s) => s.id === state.activeSimId);
      if (!sim || sim.atWork) {
        get().notify('Morador ocupado', 'Não é possível mover quem está no trabalho.', 'warning', '💼');
        return;
      }
      const path = findPathForMove(state, sim, tile);
      if (!path) {
        get().notify('Sem caminho', 'Não há um trajeto livre até esse ponto.', 'warning', '🚧');
        audio.play('error');
        return;
      }
      set((s) => ({
        sims: s.sims.map((item) => (item.id === sim.id ? {
          ...item, activity: null, pending: undefined, atWork: false,
          path, pathIndex: path.length > 1 ? 1 : path.length, autonomyCooldown: 12,
        } : item)),
      }));
      audio.play('ui');
    },

    startInteraction(simId, interactionId, targetId, targetSimId) {
      const state = get();
      if (interactionId === 'work') {
        get().goToWork(simId);
        return;
      }
      const sim = state.sims.find((s) => s.id === simId);
      if (!sim) return;
      const prepared = prepareInteraction(state, sim, interactionId, targetId, targetSimId);
      if (!prepared.ok || !prepared.pending) {
        get().notify('Ação indisponível', prepared.error ?? 'Não foi possível iniciar.', 'warning', INTERACTIONS[interactionId]?.icon ?? '✨');
        audio.play('error');
        return;
      }
      set((s) => ({
        sims: s.sims.map((item) => (item.id === simId ? {
          ...item, activity: null, atWork: false, pending: prepared.pending,
          path: prepared.path, pathIndex: prepared.path.length > 1 ? 1 : prepared.path.length,
          autonomyCooldown: 20,
        } : item)),
      }));
      audio.play('ui');
    },

    cancelActivity(simId) {
      const sim = get().sims.find((s) => s.id === simId);
      if (!sim) return;
      set((s) => ({
        sims: s.sims.map((item) => (item.id === simId ? {
          ...item, activity: null, pending: undefined, path: [], pathIndex: 0, atWork: false, autonomyCooldown: 4,
        } : item)),
      }));
      get().notify('Ação cancelada', `${sim.name} voltou a ficar livre.`, 'info', '↩️');
      audio.play('ui');
    },

    assignJob(simId, careerId) {
      const career = CAREER_BY_ID[careerId];
      const sim = get().sims.find((s) => s.id === simId);
      if (!career || !sim) return;
      set((s) => ({
        sims: s.sims.map((item) => (item.id === simId ? {
          ...item,
          job: { careerId, level: 1, shiftStart: career.shiftStart, shiftEnd: career.shiftEnd, lastWorkDay: 0, performance: 70 },
        } : item)),
      }));
      get().notify('Novo emprego', `${sim.name} agora trabalha como ${career.name}.`, 'success', career.icon);
      audio.play('success');
    },

    quitJob(simId) {
      const sim = get().sims.find((s) => s.id === simId);
      if (!sim?.job) return;
      set((s) => ({
        sims: s.sims.map((item) => (item.id === simId ? { ...item, job: null, atWork: false, activity: item.activity?.type === 'work' ? null : item.activity } : item)),
      }));
      get().notify('Carreira encerrada', `${sim.name} pediu demissão.`, 'info', '💼');
      audio.play('ui');
    },

    goToWork(simId) {
      const state = get();
      const sim = state.sims.find((s) => s.id === simId);
      if (!sim) return;
      if (!sim.job) {
        get().notify('Sem emprego', `${sim.name} precisa escolher uma carreira primeiro.`, 'warning', '💼');
        audio.play('error');
        return;
      }
      const work = beginWork(sim, state);
      if (!work) {
        get().notify('Já está trabalhando', `${sim.name} já está no expediente.`, 'info', '💼');
        return;
      }
      set((s) => ({ sims: s.sims.map((item) => (item.id === simId ? work.sim : item)) }));
      emit([work.evt]);
    },

    saveCAS(payload) {
      const state = get();
      const existing = payload.id ? state.sims.find((s) => s.id === payload.id) : undefined;
      if (existing) {
        set((s) => ({
          sims: s.sims.map((sim) => (sim.id === existing.id ? {
            ...sim, name: payload.name.trim() || sim.name, pronoun: payload.pronoun,
            appearance: cloneAppearance(payload.appearance),
            traits: payload.traits.filter((id) => TRAIT_BY_ID[id]).slice(0, 3),
            aspirationId: ASPIRATION_BY_ID[payload.aspirationId] ? payload.aspirationId : sim.aspirationId,
          } : sim)),
          ui: { ...s.ui, showCAS: false, casTargetId: null },
        }));
        get().notify('Sim atualizado', `${payload.name} foi personalizado.`, 'success', '✨');
      } else {
        if (state.sims.length >= MAX_SIMS) {
          get().notify('Casa cheia', `O máximo é ${MAX_SIMS} moradores.`, 'warning', '🏠');
          audio.play('error');
          return;
        }
        const newSim = createSim({
          name: payload.name.trim() || 'Novo morador',
          pronoun: payload.pronoun,
          appearance: payload.appearance,
          traits: payload.traits.filter((id) => TRAIT_BY_ID[id]).slice(0, 3),
          aspirationId: ASPIRATION_BY_ID[payload.aspirationId] ? payload.aspirationId : 'chef',
          position: { x: 9, z: 16 },
          mood: 78,
        });
        set((s) => ({
          sims: [
            ...s.sims.map((sim) => ({ ...sim, relationships: { ...sim.relationships, [newSim.id]: 20 } })),
            { ...newSim, relationships: Object.fromEntries(s.sims.map((sim) => [sim.id, 20])) },
          ],
          activeSimId: newSim.id,
          ui: { ...s.ui, showCAS: false, casTargetId: null },
        }));
        get().notify('Novo morador', `${newSim.name} chegou à família!`, 'success', '🎉');
      }
      audio.play('success');
      get().refreshAchievements();
    },

    removeSim(simId) {
      const state = get();
      if (state.sims.length <= 1) {
        get().notify('Não é possível remover', 'A família precisa ter ao menos um morador.', 'warning', '👤');
        audio.play('error');
        return;
      }
      const sim = state.sims.find((s) => s.id === simId);
      const remaining = state.sims.filter((s) => s.id !== simId).map((s) => {
        const relationships = { ...s.relationships };
        delete relationships[simId];
        return { ...s, relationships };
      });
      set({
        sims: remaining,
        activeSimId: state.activeSimId === simId ? remaining[0].id : state.activeSimId,
      });
      get().notify('Morador removido', `${sim?.name ?? 'Morador'} saiu da família.`, 'info', '👋');
      audio.play('delete');
    },

    saveToSlot(index, label) {
      if (index < 0 || index > 2) return;
      const state = get();
      const snapshot = snapshotFromState(state);
      const slots = readSlots();
      slots[index] = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        label: label || `${state.householdName} · Dia ${state.clock.day}`,
        householdName: state.householdName,
        day: state.clock.day,
        money: state.money,
        simCount: state.sims.length,
        snapshot,
      };
      writeSlots(slots);
      get().notify('Jogo salvo', `Slot ${index + 1} atualizado.`, 'success', '💾');
      audio.play('success');
    },

    loadFromSlot(index) {
      const slot = readSlots()[index];
      if (!slot?.snapshot) {
        get().notify('Slot vazio', 'Não há um jogo salvo nesse slot.', 'warning', '💾');
        audio.play('error');
        return;
      }
      set(hydrateSnapshot(slot.snapshot));
      audio.unlock();
      audio.setEnabled(slot.snapshot.settings?.sound ?? get().settings.sound);
      lastAudioEnv = '';
      simAccumulator = 0;
      get().notify('Jogo carregado', `${slot.label} · Dia ${slot.day}.`, 'success', '📂');
      audio.play('success');
    },

    deleteSlot(index) {
      const slots = readSlots();
      if (!slots[index]) return;
      slots[index] = null;
      writeSlots(slots);
      get().notify('Slot apagado', `Slot ${index + 1} foi liberado.`, 'info', '🗑️');
      audio.play('ui');
    },

    exportSave() {
      return JSON.stringify(snapshotFromState(get()), null, 2);
    },

    downloadSave() {
      const text = get().exportSave();
      if (typeof window === 'undefined') return;
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-save-dia-${get().clock.day}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      get().notify('Save exportado', 'O arquivo JSON foi baixado.', 'success', '📤');
      audio.play('success');
    },

    importSave(text) {
      try {
        const parsed = JSON.parse(text) as WorldSnapshot & { snapshot?: WorldSnapshot };
        const snapshot = parsed.snapshot ?? parsed;
        if (!snapshot || !snapshot.lot || !Array.isArray(snapshot.sims)) throw new Error('Formato inválido');
        set(hydrateSnapshot(snapshot));
        audio.unlock();
        audio.setEnabled(snapshot.settings?.sound ?? get().settings.sound);
        lastAudioEnv = '';
        simAccumulator = 0;
        get().notify('Save importado', 'O mundo foi carregado com sucesso.', 'success', '📥');
        audio.play('success');
        return true;
      } catch {
        get().notify('Arquivo inválido', 'Não foi possível ler este save.', 'error', '⚠️');
        audio.play('error');
        return false;
      }
    },

    autosave() {
      const snapshot = snapshotFromState(get());
      writeJSON(AUTOSAVE_KEY, snapshot);
      set({ lastAutosaveAt: Date.now() });
    },

    continueGame() {
      const snapshot = readAutosave();
      if (!snapshot) { get().startNewGame(); return; }
      set(hydrateSnapshot(snapshot));
      audio.unlock();
      audio.setEnabled(snapshot.settings?.sound ?? get().settings.sound);
      lastAudioEnv = '';
      simAccumulator = 0;
      emit([{ title: 'Bem-vindo de volta', message: `${snapshot.householdName} · Dia ${snapshot.clock?.day ?? 1}.`, tone: 'success', icon: '🌅', sound: 'success' }]);
    },

    startNewGame() {
      const base = initialState();
      const lot = createInitialLot();
      const sims = createInitialSims();
      const settings = { ...get().settings };
      persistSettings(settings);
      set({
        ...base,
        settings,
        lot,
        sims,
        activeSimId: sims[0].id,
        started: true,
        lastAutosaveAt: Date.now(),
        ui: {
          ...base.ui, showSplash: false, showSaves: false, showCAS: false,
          showSettings: false, showHelp: false, showAchievements: false, showCareers: false,
          tutorialStep: 0, cameraNonce: base.ui.cameraNonce + 1,
        },
      });
      simAccumulator = 0;
      lastNonZeroSpeed = 1;
      lastAudioEnv = '';
      audio.unlock();
      audio.setEnabled(settings.sound);
      emit([{ title: 'Bem-vindo a Aurora', message: 'Sua nova vida em 3D começa agora. Use o tutorial para dar os primeiros passos.', tone: 'success', icon: '✨', sound: 'success' }]);
    },

    newGame() {
      get().startNewGame();
    },
  };
});

export type { GameState };
