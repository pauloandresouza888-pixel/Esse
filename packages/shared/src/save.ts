/**
 * Save file schema.
 *
 * Versioned envelope with a single migration function. Phase 1 (v2) adds the
 * live world: an optional running action, the character position, the tutorial
 * cursor and the day-length setting. Old v1 saves are upgraded automatically.
 */
import { normalizeAppearance, type Character } from './character';
import { DEFAULT_HOUSE, type HouseModel } from './content';
import { createClock, type GameClock } from './clock';
import type { Needs } from './needs';
import type { ActiveAction } from './simulation';

export const SAVE_VERSION = 2 as const;

export type QualityLevel = 'low' | 'medium' | 'high';
export type LanguageCode = 'pt-BR' | 'en';
export type OrientationPreference = 'portrait' | 'landscape' | 'auto';

export interface Settings {
  language: LanguageCode;
  musicVolume: number;
  sfxVolume: number;
  quality: QualityLevel;
  orientation: OrientationPreference;
  largeText: boolean;
  colorBlindMode: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  /** Real seconds one in-game day takes (Phase 1 exposes this in Settings). */
  dayLengthSeconds: number;
}

export interface Profile {
  /** Local player id. Replaced by the account id in Phase 3. */
  id: string;
  displayName: string;
  /** Random 8-char code, the hook for friends in Phase 3. */
  friendCode: string;
  createdAt: string;
  /** True until the player opens the Friends screen for the first time. */
  isGuest: boolean;
  /** True once the guided tutorial (or its "skip") has finished. */
  tutorialDone: boolean;
  /** Index of the current tutorial step (see TUTORIAL_STEPS). */
  tutorialStep: number;
}

export interface HouseState {
  house: HouseModel;
  /** Furniture bought but not placed yet (Phase 2 store). */
  inventory: string[];
}

/** Where the character stands in the room grid (cell coordinates). */
export interface CharacterPosition {
  x: number;
  y: number;
}

export interface WorldState {
  clock: GameClock;
  character: Character;
  needs: Needs;
  money: number;
  house: HouseState;
  /** Interaction in progress, if any. Persisted so closing the app is safe. */
  action: ActiveAction | null;
  /** Current cell of the character (null = spawn point). */
  position: CharacterPosition | null;
}

export interface SaveGame {
  version: typeof SAVE_VERSION;
  /** ISO timestamp of the last write, shown on the Continue card. */
  savedAt: string;
  profile: Profile;
  settings: Settings;
  world: WorldState;
  stats: {
    /** Real milliseconds played with this save (rough playtime label). */
    playtimeMs: number;
    sessions: number;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'pt-BR',
  musicVolume: 0.5,
  sfxVolume: 0.7,
  quality: 'high',
  orientation: 'portrait',
  largeText: false,
  colorBlindMode: false,
  reducedMotion: false,
  haptics: true,
  dayLengthSeconds: 24 * 60,
};

export interface SaveLike {
  version: number;
  [key: string]: unknown;
}

/**
 * Upgrades any older save shape to the current version. Unknown future versions
 * are rejected (safer than guessing) so the UI can offer "start new game".
 */
export function migrateSave(raw: unknown): SaveGame | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as SaveLike;
  if (typeof candidate.version !== 'number') return null;
  if (candidate.version > SAVE_VERSION) return null;

  let working = raw as Record<string, unknown>;

  // v1 -> v2: Phase 1 fields. The world gained an action and a position, the
  // profile gained a tutorial cursor and the settings gained day length.
  if (candidate.version < 2) {
    const world = (working.world ?? {}) as Record<string, unknown>;
    const profile = (working.profile ?? {}) as Record<string, unknown>;
    working = {
      ...working,
      version: 2,
      profile: {
        ...profile,
        tutorialDone: profile.tutorialDone ?? true,
        tutorialStep:
          typeof profile.tutorialStep === 'number'
            ? profile.tutorialStep
            : profile.tutorialDone === false
              ? 0
              : 5,
      },
      world: {
        ...world,
        action: null,
        position: null,
      },
    };
  }

  const save = working as unknown as SaveGame;
  if (!isSaveGame(save)) return null;
  // Fill settings added after the first release and any appearance field added
  // by newer creators, so old saves keep opening with a coherent character.
  return {
    ...save,
    settings: { ...DEFAULT_SETTINGS, ...save.settings },
    profile: {
      ...save.profile,
      tutorialStep: save.profile.tutorialStep ?? (save.profile.tutorialDone ? 5 : 0),
    },
    world: {
      ...save.world,
      action: save.world.action ?? null,
      position: save.world.position ?? null,
      character: {
        ...save.world.character,
        appearance: normalizeAppearance(save.world.character.appearance),
      },
    },
  };
}

export function isSaveGame(value: unknown): value is SaveGame {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<SaveGame>;
  return (
    save.version === SAVE_VERSION &&
    typeof save.savedAt === 'string' &&
    typeof save.profile?.id === 'string' &&
    typeof save.profile?.displayName === 'string' &&
    typeof save.world?.money === 'number' &&
    typeof save.world?.clock?.totalMs === 'number' &&
    typeof save.world?.house?.house?.id === 'string' &&
    typeof save.world?.character?.id === 'string' &&
    typeof save.world?.needs?.hunger === 'number'
  );
}

export function createNewSave(
  profile: Profile,
  character: Character,
  needs: Needs,
  dayLengthSeconds: number = DEFAULT_SETTINGS.dayLengthSeconds,
): SaveGame {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    profile,
    settings: { ...DEFAULT_SETTINGS, dayLengthSeconds },
    world: {
      clock: createClock(dayLengthSeconds),
      character,
      needs,
      money: 400,
      house: { house: cloneHouse(), inventory: [] },
      action: null,
      position: null,
    },
    stats: { playtimeMs: 0, sessions: 1 },
  };
}

function cloneHouse(): HouseModel {
  return {
    ...DEFAULT_HOUSE,
    grid: [...DEFAULT_HOUSE.grid],
    items: DEFAULT_HOUSE.items.map((item) => ({ ...item })),
  };
}

export function touchSave(save: SaveGame): SaveGame {
  return { ...save, savedAt: new Date().toISOString() };
}
