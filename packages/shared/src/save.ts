/**
 * Save file schema.
 *
 * Versioned envelope with a single migration function. Phase 1 (v2) adds the
 * live world: an optional running action, the character position, the tutorial
 * cursor and the day-length setting. Old v1 saves are upgraded automatically.
 */
import type { CareerProgress } from './ai';
import { normalizeAppearance, type Character } from './character';
import { CAREER_DEFINITIONS, DEFAULT_HOUSE, itemById, SKILLS, type HouseModel } from './content';
import { createClock, type GameClock } from './clock';
import type { ActiveEmotion, Memory } from './emotions';
import type { Needs } from './needs';
import type { ActiveAction } from './simulation';
import type { RelationshipMap } from './neighborhood';

export const SAVE_VERSION = 4 as const;

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
  /** Purchased pieces already placed on the floor (Phase 2 building). */
  placed: { id: string; itemId: string; x: number; y: number }[];
}

/** Where the character stands in the room grid (cell coordinates). */
export interface CharacterPosition {
  x: number;
  y: number;
}

/** Skill levels, 0..10, for the 7 skills of the catalog. */
export type SkillLevels = Record<string, number>;

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
  /** Career and progress, null = unemployed (Phase 2). */
  career: CareerProgress | null;
  /** Skill levels 0..10, keyed by SkillId. */
  skills: SkillLevels;
  /** Progress towards the next level of each skill (0..99). */
  skillXp: SkillLevels;
  /** Active emotions (fast variables). */
  emotions: ActiveEmotion[];
  /** Recent memories, oldest first. */
  memories: Memory[];
  /** False when the player turned autonomy off in Settings. */
  autonomous: boolean;
  /** Local NPC relationships, keyed by stable npc id. */
  relationships: RelationshipMap;
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

  // Note: `isSaveGame` checks the *current* version, and `working` is still an
  // older one here. Validate the raw shape first, then stamp the version.
  const save = working as unknown as SaveGame;
  if (!isRawSaveShape(save)) return null;
  // Fill everything added after the first release: settings, appearance fields
  // and the Phase 2 world fields (career, skills, emotions, memories, autonomy).
  // Written as a normalizer instead of a second migration step because these
  // are all "optional data with a sane default", not shape changes.
  return {
    ...save,
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...save.settings },
    profile: {
      ...save.profile,
      tutorialStep: save.profile.tutorialStep ?? (save.profile.tutorialDone ? 5 : 0),
    },
    world: {
      ...save.world,
      action: save.world.action ?? null,
      position: save.world.position ?? null,
      career: normalizeCareer(save.world.career),
      skills: createSkillLevels(save.world.skills ?? {}),
      skillXp: createSkillLevels(save.world.skillXp ?? {}),
      emotions: Array.isArray(save.world.emotions)
        ? save.world.emotions.filter((emotion) => typeof emotion?.id === 'string')
        : [],
      memories: Array.isArray(save.world.memories) ? save.world.memories.slice(-12) : [],
      autonomous: save.world.autonomous !== false,
      relationships: normalizeRelationships(save.world.relationships),
      house: {
        ...save.world.house,
        inventory: Array.isArray(save.world.house?.inventory)
          ? save.world.house.inventory
              .filter((id): id is string => typeof id === 'string' && Boolean(itemById(id)))
              .slice(0, 200)
          : [],
        placed: Array.isArray(save.world.house?.placed)
          ? save.world.house.placed.filter(
              (piece) =>
                piece &&
                typeof piece.id === 'string' &&
                typeof piece.itemId === 'string' &&
                Boolean(itemById(piece.itemId)) &&
                Number.isFinite(piece.x) &&
                Number.isFinite(piece.y),
            ).slice(0, 200)
          : [],
      },
      character: {
        ...save.world.character,
        appearance: normalizeAppearance(save.world.character.appearance),
      },
    },
  };
}

/** Keep only well-formed local relationship values and clamp each score. */
function normalizeRelationships(raw: unknown): RelationshipMap {
  if (!raw || typeof raw !== 'object') return {};
  const result: RelationshipMap = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as { friendship?: unknown; romance?: unknown; interactions?: unknown };
    result[id] = {
      friendship: Math.max(0, Math.min(100, Number(candidate.friendship) || 0)),
      romance: Math.max(0, Math.min(100, Number(candidate.romance) || 0)),
      interactions: Math.max(0, Math.round(Number(candidate.interactions) || 0)),
    };
  }
  return result;
}

/** Accepts only careers the catalog knows and clamps the numbers. */
function normalizeCareer(raw: unknown): CareerProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<CareerProgress>;
  if (!candidate.career) return null;
  if (!(candidate.career in CAREER_DEFINITIONS)) return null;
  const level = Math.max(1, Math.min(5, Math.round(Number(candidate.level ?? 1))));
  const performance = Math.max(0, Math.min(100, Number(candidate.performance ?? 0)));
  const shiftsWorked = Math.max(0, Math.round(Number(candidate.shiftsWorked ?? 0)));
  return {
    career: candidate.career,
    level,
    performance,
    shiftsWorked,
    missedLastShift: Boolean(candidate.missedLastShift),
  };
}

/** Shape check for a save of *any* known version (used by the migration). */
function isRawSaveShape(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<SaveGame>;
  return (
    typeof save.version === 'number' &&
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
      house: { house: cloneHouse(), inventory: [], placed: [] },
      action: null,
      position: null,
      career: null,
      skills: createSkillLevels(),
      skillXp: createSkillLevels(),
      emotions: [],
      memories: [],
      autonomous: true,
      relationships: {},
    },
    stats: { playtimeMs: 0, sessions: 1 },
  };
}

/** All skills start at zero; the catalog is the single source of the list. */
export function createSkillLevels(overrides: Partial<Record<string, number>> = {}): SkillLevels {
  const levels: SkillLevels = {};
  for (const skill of SKILLS) levels[skill] = 0;
  for (const [skill, level] of Object.entries(overrides)) {
    if (typeof level === 'number') levels[skill] = Math.max(0, Math.min(10, level));
  }
  return levels;
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
