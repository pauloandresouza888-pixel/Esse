import { create } from 'zustand';
import {
  advanceWorld,
  applyTutorialSignal,
  beginAction,
  cancelAction,
  createCharacterForTest,
  createFriendCode,
  createId,
  createNeeds,
  createNewSave,
  currentTutorialStep,
  DEFAULT_SETTINGS,
  simulateAway,
  finishTutorial,
  migrateSave,
  skipAction,
  type ActiveAction,
  type Appearance,
  type Character,
  type Gender,
  type InteractionId,
  type LanguageCode,
  type Needs,
  type Profile,
  type QualityLevel,
  type SaveGame,
  type Settings,
  type SimEvent,
  type TutorialSignal,
  touchSave,
} from '@vida/shared';
import { storage } from '@/platform/storage';
import { resolveLanguage } from '@/i18n';

/**
 * Single source of truth for the persistent game.
 *
 * Design notes (for a junior dev):
 * - The store holds one plain `SaveGame` object. Every mutation creates a new
 *   object (immutability) and writes it to localStorage through `persistSoon`.
 * - Writes are debounced: the game loop runs several times per second, so
 *   writing on every tick would hammer the storage. `flushSave` forces a write
 *   when the player leaves the room, the tab is hidden or the app closes.
 * - Phase 1 adds the live world (needs, action, position, tutorial). The rules
 *   themselves are NOT here: they come from `@vida/shared` (`advanceWorld`),
 *   which the future server will run too.
 */

export type BootStatus = 'idle' | 'ready';

export interface CharacterDraft {
  name: string;
  age: number;
  gender: Gender;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
  profileName: string;
}

interface GameState {
  bootStatus: BootStatus;
  save: SaveGame | null;
  /** Set when a save existed but could not be read (offers "reset"). */
  storageWarning: string | null;
  load: () => void;
  createProfile: (options?: { displayName?: string; tutorialDone?: boolean }) => void;
  /** Replaces the character (Phase 1 creator) and starts a fresh day. */
  createCharacter: (draft: CharacterDraft) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSave: () => void;
  flushSave: () => void;
  addPlaytime: (realMs: number) => void;
  /** Persists the game clock (also used when leaving the room screen). */
  setClockTotalMs: (totalMs: number) => void;
  setGuestDisplayName: (name: string) => void;

  /* ---- live world (Phase 1) ---- */
  /** Runs one simulation step for `realMs` and returns its events. */
  tickWorld: (realMs: number) => SimEvent[];
  /** Starts an interaction on a catalog item (no-op if unknown). */
  startInteraction: (itemId: string, interactionId: InteractionId) => boolean;
  cancelInteraction: () => void;
  /** Fast-forwards the rest of the current interaction. */
  skipInteraction: () => SimEvent[];
  setPosition: (x: number, y: number) => void;
  /** Marks a tutorial step (walked / used an object / woke up). */
  signalTutorial: (signal: TutorialSignal) => void;
  skipTutorial: () => void;
}

const SAVE_DEBOUNCE_MS = 600;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Most recent save waiting for the debounced write. */
let latestSave: SaveGame | null = null;

function writeSaveToStorage(save: SaveGame): boolean {
  return storage.writeSave(JSON.stringify(save));
}

function persistSoon(save: SaveGame): void {
  // The timer always writes `latestSave` instead of the object captured when it
  // was scheduled: otherwise a quick sequence of changes (tick → eat → walk)
  // would persist the oldest of them, and `flushSave` would drop the newest.
  latestSave = save;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (latestSave) writeSaveToStorage(touchSave(latestSave));
  }, SAVE_DEBOUNCE_MS);
}

function newGuestProfile(displayName: string, tutorialDone: boolean): Profile {
  return {
    id: createId('player'),
    displayName,
    friendCode: createFriendCode(),
    createdAt: new Date().toISOString(),
    isGuest: true,
    tutorialDone,
    tutorialStep: tutorialDone ? 5 : 0,
  };
}

/** Default starter character so the creator always opens a real save. */
function createStarterCharacter(): Character {
  return { ...createCharacterForTest(), id: createId('char') };
}

function createFreshSave(displayName: string, tutorialDone: boolean): SaveGame {
  return createNewSave(
    newGuestProfile(displayName, tutorialDone),
    createStarterCharacter(),
    // A new player starts a bit tired and peckish: the tutorial has something
    // to fix from the first minute instead of "everything is full".
    createNeeds({ hunger: 62, energy: 70, hygiene: 78, fun: 66, social: 72, bladder: 74 }),
  );
}

/** Reads the current save from storage, trying the backup copy if needed. */
function readStoredSave(): { save: SaveGame | null; corrupt: boolean } {
  const primary = storage.readSave();
  const parse = (raw: string | null): SaveGame | null => {
    if (!raw) return null;
    try {
      return migrateSave(JSON.parse(raw));
    } catch {
      return null;
    }
  };
  const save = parse(primary);
  if (save) return { save, corrupt: false };
  const backup = parse(storage.readSaveBackup());
  if (backup) return { save: backup, corrupt: true };
  return { save: null, corrupt: Boolean(primary) };
}

/** Offline progress: simulate the (capped) time the app was closed. */
function catchUpOffline(save: SaveGame): SaveGame {
  const savedAt = Date.parse(save.savedAt);
  if (!Number.isFinite(savedAt)) return save;
  // The clock is only as fresh as the last save; the world keeps living for the
  // capped window so reopening after a night feels alive.
  const { world } = simulateAway(
    { clock: save.world.clock, needs: save.world.needs, action: save.world.action },
    Date.now() - savedAt,
  );
  return {
    ...save,
    world: {
      ...save.world,
      clock: world.clock,
      needs: world.needs,
      action: world.action,
    },
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  bootStatus: 'idle',
  save: null,
  storageWarning: null,

  load: () => {
    const { save, corrupt } = readStoredSave();
    if (save) {
      const caughtUp = catchUpOffline(save);
      set({
        bootStatus: 'ready',
        save: { ...caughtUp, stats: { ...caughtUp.stats, sessions: caughtUp.stats.sessions + 1 } },
        storageWarning: corrupt ? 'backup' : null,
      });
      return;
    }
    set({ bootStatus: 'ready', save: null, storageWarning: corrupt ? 'corrupt' : null });
  },

  createProfile: (options) => {
    const displayName = options?.displayName ?? 'Jogador';
    const save = createFreshSave(displayName, options?.tutorialDone ?? true);
    writeSaveToStorage(save);
    set({ bootStatus: 'ready', save, storageWarning: null });
  },

  createCharacter: (draft) => {
    const current = get().save;
    const base = current ?? createFreshSave(draft.profileName.trim() || 'Jogador', false);
    const character: Character = {
      ...base.world.character,
      id: createId('char'),
      name: draft.name.trim().slice(0, 20),
      age: Math.round(Math.min(90, Math.max(16, draft.age))),
      gender: draft.gender,
      appearance: { ...draft.appearance },
      traits: [...draft.traits],
      aspiration: draft.aspiration,
      minutesLived: 0,
    };
    const save: SaveGame = {
      ...base,
      profile: {
        ...base.profile,
        displayName: draft.profileName.trim().slice(0, 24) || base.profile.displayName,
        // A brand new character restarts the guided tutorial.
        tutorialDone: false,
        tutorialStep: 0,
      },
      world: {
        ...base.world,
        character,
        // Fresh start: a full day at 07:00 with a slightly hungry character.
        clock: { ...base.world.clock, totalMs: 7 * 3_600_000 },
        needs: createNeeds({ hunger: 62, energy: 70, hygiene: 78, fun: 66, social: 72, bladder: 74 }),
        action: null,
        position: null,
      },
      savedAt: new Date().toISOString(),
    };
    writeSaveToStorage(save);
    set({ bootStatus: 'ready', save, storageWarning: null });
  },

  updateSettings: (patch) => {
    const current = get().save;
    if (!current) {
      // No save yet: remember the preference for the next profile creation by
      // storing a settings-only draft (also keeps the language selector usable).
      const draft = { ...DEFAULT_SETTINGS, ...patch };
      storage.writeSettings(JSON.stringify(draft));
      return;
    }
    const save: SaveGame = {
      ...current,
      settings: { ...current.settings, ...patch },
    };
    set({ save });
    persistSoon(save);
  },

  resetSave: () => {
    storage.clear();
    const save = createFreshSave('Jogador', false);
    writeSaveToStorage(save);
    set({ save, storageWarning: null });
  },

  flushSave: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const current = get().save;
    if (current) {
      latestSave = null;
      writeSaveToStorage(touchSave(current));
    }
  },

  addPlaytime: (realMs) => {
    const current = get().save;
    if (!current) return;
    // Clamp per call: a tab returning from background must not add hours.
    const delta = Math.min(Math.max(realMs, 0), 60_000);
    const save: SaveGame = {
      ...current,
      stats: { ...current.stats, playtimeMs: current.stats.playtimeMs + delta },
    };
    set({ save });
  },

  setClockTotalMs: (totalMs) => {
    const current = get().save;
    if (!current) return;
    if (Math.abs(current.world.clock.totalMs - totalMs) < 1000) return;
    const save: SaveGame = {
      ...current,
      world: { ...current.world, clock: { ...current.world.clock, totalMs } },
    };
    set({ save });
    persistSoon(save);
  },

  setGuestDisplayName: (name) => {
    const current = get().save;
    if (!current) return;
    const save: SaveGame = {
      ...current,
      profile: { ...current.profile, displayName: name.trim().slice(0, 24) || 'Jogador' },
    };
    set({ save });
    persistSoon(save);
  },

  /* -------------------------------------------------------------------- */
  /*                            LIVE WORLD                                */
  /* -------------------------------------------------------------------- */

  tickWorld: (realMs) => {
    const current = get().save;
    if (!current) return [];
    const result = advanceWorld(
      {
        clock: current.world.clock,
        needs: current.world.needs,
        action: current.world.action,
      },
      realMs,
    );
    if (result.world === current.world && result.events.length === 0) return [];

    let profile = current.profile;
    for (const event of result.events) {
      if (event.type === 'action-completed') {
        const signal: TutorialSignal =
          event.itemId === 'bed' || event.wokeReason
            ? { type: 'woke-up' }
            : { type: 'action-completed', itemId: event.itemId };
        profile = applyTutorialSignal(profile, signal);
      }
    }

    const save: SaveGame = {
      ...current,
      profile,
      world: {
        ...current.world,
        clock: result.world.clock,
        needs: result.world.needs,
        action: result.world.action,
      },
    };
    // The loop calls this ~4x/s; `set` is cheap and only subscribers that read
    // the world fields re-render (the HUD, the progress bar and the tutorial).
    set({ save });
    // Persist at most every few seconds — the debounce collapses the rest.
    persistSoon(save);
    return result.events;
  },

  startInteraction: (itemId, interactionId) => {
    const current = get().save;
    if (!current) return false;
    const begun = beginAction(
      {
        clock: current.world.clock,
        needs: current.world.needs,
        action: current.world.action,
      },
      itemId,
      interactionId,
    );
    if (!begun) return false;
    const save: SaveGame = {
      ...current,
      world: { ...current.world, action: begun.action },
    };
    set({ save });
    persistSoon(save);
    return true;
  },

  cancelInteraction: () => {
    const current = get().save;
    if (!current?.world.action) return;
    const { world } = cancelAction({
      clock: current.world.clock,
      needs: current.world.needs,
      action: current.world.action,
    });
    const save: SaveGame = {
      ...current,
      world: { ...current.world, action: world.action },
    };
    set({ save });
    persistSoon(save);
  },

  skipInteraction: () => {
    const current = get().save;
    if (!current?.world.action) return [];
    const result = skipAction({
      clock: current.world.clock,
      needs: current.world.needs,
      action: current.world.action,
    });
    let profile = current.profile;
    for (const event of result.events) {
      if (event.type === 'action-completed') {
        profile = applyTutorialSignal(profile, { type: 'woke-up' });
      }
    }
    const save: SaveGame = {
      ...current,
      profile,
      world: {
        ...current.world,
        clock: result.world.clock,
        needs: result.world.needs,
        action: result.world.action,
      },
    };
    set({ save });
    persistSoon(save);
    return result.events;
  },

  setPosition: (x, y) => {
    const current = get().save;
    if (!current) return;
    const previous = current.world.position;
    if (previous && previous.x === x && previous.y === y) return;
    const save: SaveGame = {
      ...current,
      world: { ...current.world, position: { x, y } },
    };
    set({ save });
    persistSoon(save);
  },

  signalTutorial: (signal) => {
    const current = get().save;
    if (!current || current.profile.tutorialDone) return;
    const profile = applyTutorialSignal(current.profile, signal);
    if (profile === current.profile) return;
    const save: SaveGame = { ...current, profile };
    set({ save });
    persistSoon(save);
  },

  skipTutorial: () => {
    const current = get().save;
    if (!current) return;
    const save: SaveGame = { ...current, profile: finishTutorial(current.profile) };
    set({ save });
    persistSoon(save);
  },
}));

/** Structured settings getter that always has a value (draft when no save). */
export function readSettingsDraft(): Settings {
  const raw = storage.readSettings();
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Applies visual settings to <html> so CSS can react (large text, motion). */
export function applySettingsToDocument(settings: Settings, language: LanguageCode): void {
  const root = document.documentElement;
  root.dataset.largeText = String(settings.largeText);
  root.dataset.reducedMotion = String(settings.reducedMotion);
  root.dataset.colorBlind = String(settings.colorBlindMode);
  root.lang = language;
}

/** Resolves the language to use given settings and the browser preference. */
export function resolveActiveLanguage(settings: Settings): LanguageCode {
  if (settings.language) return resolveLanguage(settings.language);
  return resolveLanguage(navigator.language);
}

export function qualityFromSettings(settings: Settings): QualityLevel {
  return settings.quality;
}

/** Convenience selector used by the tutorial bubble and the HUD. */
export function readTutorialStep(save: SaveGame | null) {
  return save ? currentTutorialStep(save.profile) : null;
}

export type { ActiveAction, Needs };
