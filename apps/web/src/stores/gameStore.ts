import { create } from 'zustand';
import {
  advanceWorld,
  applyShift,
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
  itemById,
  migrateSave,
  skipAction,
  type ActiveAction,
  type Appearance,
  type CareerId,
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
  // Phase 2: autonomy, careers and emotions
  CAREER_SKILL,
  applyRelationshipAction,
  NEIGHBORHOOD_NPCS,
  npcLocationAtHour,
  readClock,
  buyItem,
  decideNextAction,
  findFreeSpot,
  takeFromInventory,
  ROOM_PLACEMENTS,
  remember,
  type AiObject,
  type AiDecision,
  type CareerProgress,
  type EmotionId,
  type Relationship,
  type RelationshipAction,
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

  /* ---- autonomy and life (Phase 2) ---- */
  /**
   * Lets the character decide for itself. Called by the game loop every few
   * seconds; returns the decision (null when it decided to do nothing).
   */
  think: () => AiDecision | null;
  /** Turns autonomy on/off (Settings). */
  setAutonomous: (enabled: boolean) => void;
  /** Takes a job; leaves the current one when switching. */
  startCareer: (career: CareerId) => boolean;
  /** Pays the current shift and applies performance/promotion. */
  workShift: (options?: { missed?: boolean }) => {
    salary: number;
    promoted: boolean;
    level: number;
  };
  /** Adds skill XP to one skill and returns the new level. */
  addSkillXp: (skill: string, xp: number) => number;
  /** Adds an emotion (used by work, purchases, story events). */
  addEmotion: (emotion: EmotionId, reason: string) => void;

  /* ---- store and building (Phase 2) ---- */
  /** Buys one unit; false when the money is not enough (nothing changes). */
  buyFurniture: (itemId: string) => boolean;
  /** Places an inventory item on the first free spot; false when the room is full. */
  placeFurniture: (itemId: string) => boolean;
  /** Puts a placed piece back into the inventory. */
  unplaceFurniture: (placementId: string) => void;

  /* ---- neighborhood and local relationships (Phase 2) ---- */
  interactWithNpc: (npcId: string, action: RelationshipAction) => Relationship | null;
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
    {
      clock: save.world.clock,
      needs: save.world.needs,
      action: save.world.action,
      emotions: save.world.emotions,
      memories: save.world.memories,
    },
    Date.now() - savedAt,
  );
  return {
    ...save,
    world: {
      ...save.world,
      clock: world.clock,
      needs: world.needs,
      action: world.action,
      emotions: world.emotions ?? save.world.emotions,
      memories: world.memories ?? save.world.memories,
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
        emotions: current.world.emotions,
        memories: current.world.memories,
      },
      realMs,
    );
    if (result.world === current.world && result.events.length === 0) return [];

    let profile = current.profile;
    let skills = current.world.skills;
    let skillXp = current.world.skillXp ?? {};
    for (const event of result.events) {
      if (event.type === 'action-completed') {
        const signal: TutorialSignal =
          event.itemId === 'bed' || event.wokeReason
            ? { type: 'woke-up' }
            : { type: 'action-completed', itemId: event.itemId };
        profile = applyTutorialSignal(profile, signal);
        // Using an object that trains a skill earns xp: cooking on the stove,
        // painting at the easel... The AI levels up the same way the player does.
        const item = itemById(event.itemId);
        if (item?.skill) {
          const level = skills[item.skill] ?? 0;
          const total = (skillXp[item.skill] ?? 0) + 12;
          const gained = Math.floor(total / 100);
          skillXp = { ...skillXp, [item.skill]: total % 100 };
          if (gained > 0) skills = { ...skills, [item.skill]: Math.min(10, level + gained) };
        }
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
        emotions: result.world.emotions ?? current.world.emotions,
        memories: result.world.memories ?? current.world.memories,
        skills,
        skillXp,
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
        emotions: current.world.emotions,
        memories: current.world.memories,
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
      emotions: current.world.emotions,
      memories: current.world.memories,
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
      emotions: current.world.emotions,
      memories: current.world.memories,
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
        emotions: result.world.emotions ?? current.world.emotions,
        memories: result.world.memories ?? current.world.memories,
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

  /* -------------------------------------------------------------------- */
  /*                     AUTONOMY, CAREERS, EMOTIONS                       */
  /* -------------------------------------------------------------------- */

  think: () => {
    const current = get().save;
    if (!current) return null;
    const world = current.world;
    // While an action runs, or with autonomy off, the character just lives.
    if (world.action || !world.autonomous) return null;
    // The tutorial teaches the player the controls: the AI stays quiet until
    // it is done, otherwise the character would "steal" the first steps.
    if (!current.profile.tutorialDone) return null;

    const objects: AiObject[] = ROOM_PLACEMENTS.filter(
      (placement) => placement.interactive !== false,
    ).map((placement) => ({ id: placement.id, itemId: placement.itemId }));

    const decision = decideNextAction(
      {
        needs: world.needs,
        clock: world.clock,
        traits: world.character.traits,
        career: world.career?.career ?? null,
        skills: world.skills,
        objects,
      },
      `${current.profile.id}:${Math.floor(world.clock.totalMs / 60_000)}`,
    );

    if (decision.kind !== 'interact') return decision;
    // Guard: the chosen object must still exist in the house.
    const placement = ROOM_PLACEMENTS.find((candidate) => candidate.itemId === decision.itemId);
    if (!placement) return null;
    const started = get().startInteraction(decision.itemId, decision.interactionId);
    if (!started) return null;
    return decision;
  },

  setAutonomous: (enabled) => {
    const current = get().save;
    if (!current) return;
    const save: SaveGame = {
      ...current,
      world: { ...current.world, autonomous: enabled },
    };
    set({ save });
    persistSoon(save);
  },

  startCareer: (career) => {
    const current = get().save;
    if (!current) return false;
    // A new job always starts at level 1 with a clean performance sheet.
    const progress: CareerProgress = {
      career,
      level: 1,
      performance: 0,
      shiftsWorked: 0,
    };
    const remembered = remember(
      current.world.memories,
      current.world.emotions,
      {
        interactionId: 'work',
        atMs: current.world.clock.totalMs,
        mood: 2,
        emotion: 'inspired',
      },
      current.world.clock.totalMs,
      current.world.clock.dayLengthMs,
    );
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        career: progress,
        memories: remembered.memories,
        emotions: remembered.emotions,
      },
    };
    set({ save });
    persistSoon(save);
    return true;
  },

  workShift: (options = {}) => {
    const current = get().save;
    if (!current?.world.career) {
      return { salary: 0, promoted: false, level: 0 };
    }
    const definition = current.world.career;
    // Skills are keyed by SkillId, not by career id: `chef` trains `cooking`.
    const careerSkill = CAREER_SKILL[definition.career];
    const skillLevel = current.world.skills[careerSkill] ?? 0;
    const result = applyShift(definition, {
      missed: options.missed,
      skillLevel,
    });
    const salary = result.salary;
    const nowMs = current.world.clock.totalMs;
    const emotion = options.missed
      ? ('stressed' as const)
      : result.promoted
        ? ('inspired' as const)
        : ('energized' as const);
    const remembered = remember(
      current.world.memories,
      current.world.emotions,
      {
        interactionId: options.missed ? 'missedShift' : result.promoted ? 'promotion' : 'work',
        atMs: nowMs,
        mood: 0,
        emotion,
      },
      nowMs,
      current.world.clock.dayLengthMs,
    );
    const needs = { ...current.world.needs };
    let skills = current.world.skills;
    let skillXp = current.world.skillXp ?? {};
    if (!options.missed) {
      // A worked shift costs energy and fun, and pays the salary.
      needs.energy = Math.max(0, needs.energy - 14);
      needs.fun = Math.max(0, needs.fun - 8);
      // Working is the main way to train the career skill: +35 xp per shift
      // (a promotion run needs ~3 shifts to see the first level).
      const level = current.world.skills[careerSkill] ?? 0;
      const total = (skillXp[careerSkill] ?? 0) + 35;
      const gained = Math.floor(total / 100);
      if (gained > 0) {
        skills = { ...current.world.skills, [careerSkill]: Math.min(10, level + gained) };
        skillXp = { ...skillXp, [careerSkill]: total % 100 };
      } else {
        skillXp = { ...skillXp, [careerSkill]: total };
      }
    }
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        career: result.progress,
        money: current.world.money + salary,
        needs,
        skills,
        skillXp,
        emotions: remembered.emotions,
        memories: remembered.memories,
      },
    };
    set({ save });
    persistSoon(save);
    return { salary, promoted: result.promoted, level: result.progress.level };
  },

  addSkillXp: (skill, xp) => {
    const current = get().save;
    if (!current) return 0;
    // 100 XP per level, capped at 10. Simple on purpose: the bar in the UI is
    // "xp % 100", and a level is a milestone, not a grind.
    const currentLevel = current.world.skills[skill] ?? 0;
    const currentXp = current.world.skillXp?.[skill] ?? 0;
    const total = currentXp + Math.max(0, xp);
    const gained = Math.floor(total / 100);
    const level = Math.min(10, currentLevel + gained);
    const remaining = gained > 0 ? total % 100 : total;
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        skills: { ...current.world.skills, [skill]: level },
        skillXp: { ...(current.world.skillXp ?? {}), [skill]: remaining },
      },
    };
    set({ save });
    persistSoon(save);
    return level;
  },

  buyFurniture: (itemId) => {
    const current = get().save;
    if (!current) return false;
    const result = buyItem(itemId, current.world.money, current.world.house.inventory);
    if (!result.ok) return false;
    const remembered = remember(
      current.world.memories,
      current.world.emotions,
      {
        interactionId: 'purchase',
        atMs: current.world.clock.totalMs,
        mood: 4,
        emotion: 'happy',
      },
      current.world.clock.totalMs,
      current.world.clock.dayLengthMs,
    );
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        money: result.money,
        house: { ...current.world.house, inventory: result.inventory },
        emotions: remembered.emotions,
        memories: remembered.memories,
      },
    };
    set({ save });
    persistSoon(save);
    return true;
  },

  placeFurniture: (itemId) => {
    const current = get().save;
    if (!current) return false;
    const inventory = takeFromInventory(current.world.house.inventory, itemId);
    if (!inventory) return false;
    const placed = current.world.house.placed ?? [];
    const nextIndex = placed.reduce((max, entry) => {
      const match = /^extra-(\d+)$/.exec(entry.id);
      return match ? Math.max(max, Number(match[1]) + 1) : max;
    }, 1);
    const spot = findFreeSpot(itemId, placed, nextIndex);
    if (!spot) return false;
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        house: {
          ...current.world.house,
          inventory,
          placed: [...placed, { id: spot.id, itemId: spot.itemId, x: spot.x, y: spot.y }],
        },
      },
    };
    set({ save });
    persistSoon(save);
    return true;
  },

  unplaceFurniture: (placementId) => {
    const current = get().save;
    const placed = current?.world.house.placed ?? [];
    const piece = placed.find((entry) => entry.id === placementId);
    if (!current || !piece) return;
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        house: {
          ...current.world.house,
          placed: placed.filter((entry) => entry.id !== placementId),
          inventory: [...current.world.house.inventory, piece.itemId],
        },
      },
    };
    set({ save });
    persistSoon(save);
  },

  interactWithNpc: (npcId, action) => {
    const current = get().save;
    if (!current || !NEIGHBORHOOD_NPCS.some((npc) => npc.id === npcId)) return null;
    const hour = readClock(current.world.clock).hour;
    if (!npcLocationAtHour(npcId, hour)) return null;
    const relationship = applyRelationshipAction(current.world.relationships?.[npcId], action);
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        relationships: { ...current.world.relationships, [npcId]: relationship },
      },
    };
    set({ save });
    persistSoon(save);
    return relationship;
  },

  addEmotion: (emotion, reason) => {
    const current = get().save;
    if (!current) return;
    const remembered = remember(
      current.world.memories,
      current.world.emotions,
      { interactionId: 'work', atMs: current.world.clock.totalMs, mood: 0, emotion },
      current.world.clock.totalMs,
      current.world.clock.dayLengthMs,
    );
    const save: SaveGame = {
      ...current,
      world: {
        ...current.world,
        emotions: remembered.emotions,
        memories: remembered.memories,
      },
    };
    set({ save });
    persistSoon(save);
    void reason;
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
