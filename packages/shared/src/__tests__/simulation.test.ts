import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_OPTIONS,
  ACTION_SPEED,
  advanceWorld,
  approachCell,
  BROW_OPTIONS,
  buildBlockedGrid,
  DEFAULT_APPEARANCE,
  applyTutorialSignal,
  beginAction,
  cancelAction,
  collectEffects,
  createClock,
  createNeeds,
  finishTutorial,
  EYE_OPTIONS,
  findRoomPath,
  HAIR_COLORS,
  HAIR_STYLES,
  interactionsFor,
  isBlocked,
  migrateSave,
  MOUTH_OPTIONS,
  NOSE_OPTIONS,
  normalizeAppearance,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  readClock,
  ROOM_CELLS,
  simulateAway,
  ROOM_PLACEMENTS,
  SKIN_TONES,
  SPAWN_CELL,
  skipAction,
  SLEEP_SPEED,
  SLEEP_WAKE_ENERGY,
  TUTORIAL_STEPS,
  tutorialStepForSignal,
  validateCharacterDraft,
  createNewSave,
  createCharacterForTest,
  SAVE_VERSION,
  type Profile,
  type SimWorld,
} from '../index';

const DAY_LENGTH_MS = 24 * 60 * 1000;

function world(overrides: Partial<SimWorld> = {}): SimWorld {
  return {
    clock: createClock(DAY_LENGTH_MS / 1000, 8, 0),
    needs: createNeeds({ energy: 60, hunger: 55 }),
    action: null,
    ...overrides,
  };
}

/** Real milliseconds equivalent to `gameMinutes` at 1x for a 24-min day. */
const realMsForMinutes = (gameMinutes: number) => gameMinutes * 1000;

describe('simulation: interactions', () => {
  it('knows the catalog interactions of the five core objects', () => {
    expect(interactionsFor('bed')).toContain('sleep');
    expect(interactionsFor('fridge')).toEqual(expect.arrayContaining(['eat', 'cook']));
    expect(interactionsFor('shower')).toContain('shower');
    expect(interactionsFor('toilet')).toEqual(['toilet']);
    expect(interactionsFor('sofa')).toContain('relax');
    expect(interactionsFor('nope')).toEqual([]);
  });

  it('collects and sums need effects', () => {
    expect(collectEffects('fridge', 'eat')).toEqual({ hunger: 38, mood: 4 });
    expect(collectEffects('toilet', 'toilet')).toEqual({ bladder: 100 });
  });

  it('refuses interactions the catalog does not define', () => {
    expect(beginAction(world(), 'fridge', 'sleep')).toBeNull();
    expect(beginAction(world(), 'ghost-item', 'eat')).toBeNull();
  });

  it('eating restores hunger faster than the normal decay', () => {
    const started = beginAction(world({ needs: createNeeds({ hunger: 30 }) }), 'fridge', 'eat')!;
    // 25 game minutes at 4x = ~6 real seconds.
    const { world: after, events } = advanceWorld(started.world, 6_500);
    expect(after.needs.hunger).toBeGreaterThan(60);
    expect(after.action).toBeNull();
    expect(events.some((event) => event.type === 'action-completed')).toBe(true);
  });

  it('running an action advances the clock at its speed', () => {
    const started = beginAction(world(), 'sofa', 'relax')!;
    expect(started.action.speed).toBe(ACTION_SPEED);
    const { world: after } = advanceWorld(started.world, 1000);
    // 1 real second at 1x = 1 game minute; at 4x = 4 game minutes.
    expect(after.clock.totalMs - started.world.clock.totalMs).toBe(4 * 60_000);
  });

  it('cancelling an action stops its effects immediately', () => {
    const started = beginAction(world({ needs: createNeeds({ hunger: 20 }) }), 'fridge', 'eat')!;
    const cancelled = cancelAction(started.world);
    expect(cancelled.world.action).toBeNull();
    expect(cancelled.events[0]?.type).toBe('action-cancelled');
    const { world: after } = advanceWorld(cancelled.world, 2000);
    expect(after.needs.hunger).toBeLessThan(20); // normal decay resumed
  });

  it('skipping an action completes it with the full effect', () => {
    const started = beginAction(world({ needs: createNeeds({ bladder: 10 }) }), 'toilet', 'toilet')!;
    const { world: after } = skipAction(started.world);
    expect(after.action).toBeNull();
    expect(after.needs.bladder).toBe(100);
  });
});

describe('simulation: sleep', () => {
  it('sleeps at 30x, recovers energy and wakes up near full', () => {
    const started = beginAction(world({ needs: createNeeds({ energy: 25, hunger: 90 }) }), 'bed', 'sleep')!;
    expect(started.action.speed).toBe(SLEEP_SPEED);
    // 8 real seconds at 30x = 4 game hours: enough to reach the wake energy.
    const { world: after, events } = advanceWorld(started.world, 8_000);
    expect(after.action).toBeNull();
    expect(after.needs.energy).toBeGreaterThanOrEqual(SLEEP_WAKE_ENERGY - 5);
    const completed = events.find((event) => event.type === 'action-completed');
    expect(completed).toMatchObject({ itemId: 'bed', wokeReason: 'energy' });
  });

  it('wakes up early when starving', () => {
    const started = beginAction(world({ needs: createNeeds({ energy: 10, hunger: 18 }) }), 'bed', 'sleep')!;
    const { world: after, events } = advanceWorld(started.world, 2_000);
    expect(after.action).toBeNull();
    expect(events.some((event) => event.type === 'action-completed' && event.wokeReason === 'hunger')).toBe(
      true,
    );
  });

  it('a full sleep night moves the clock forward by hours, not days', () => {
    const started = beginAction(
      world({ clock: createClock(1440, 22, 0), needs: createNeeds({ energy: 5 }) }),
      'bed',
      'sleep',
    )!;
    const { world: after } = advanceWorld(started.world, 10_000);
    const reading = readClock(after.clock);
    // 10 real seconds at 30x = 10 game hours, capped by the 8 h sleep duration:
    // it is still the same night-on-the-clock, day 2, early morning.
    expect(reading.day).toBe(2);
    expect(reading.hour).toBeLessThanOrEqual(6);
    expect(after.action).toBeNull();
  });
});

describe('simulation: needs and events', () => {
  it('decays needs in normal time and never below zero', () => {
    const start = world({ needs: createNeeds({ hunger: 1 }) });
    const { world: after } = advanceWorld(start, realMsForMinutes(30));
    expect(after.needs.hunger).toBe(0);
  });

  it('emits need-critical when a need crosses below the threshold', () => {
    const start = world({ needs: createNeeds({ hunger: 22 }) });
    const { events } = advanceWorld(start, realMsForMinutes(15));
    expect(events).toEqual(expect.arrayContaining([{ type: 'need-critical', need: 'hunger' }]));
  });

  it('emits day-changed when the clock passes midnight', () => {
    const start = world({ clock: createClock(1440, 23, 50) });
    const { events } = advanceWorld(start, realMsForMinutes(15));
    expect(events).toEqual(expect.arrayContaining([{ type: 'day-changed', day: 2 }]));
  });

  it('caps a single step so a sleeping tab cannot skip days', () => {
    const start = world();
    const { world: after } = advanceWorld(start, 60 * 60 * 1000);
    // MAX_STEP_REAL_MS = 60s -> 60 game minutes at 1x.
    expect(after.clock.totalMs - start.clock.totalMs).toBe(60 * 60_000);
  });
});

describe('tutorial', () => {
  const baseProfile: Profile = {
    id: 'player',
    displayName: 'Teste',
    friendCode: 'ABCD2345',
    createdAt: '2026-01-01T00:00:00.000Z',
    isGuest: true,
    tutorialDone: false,
    tutorialStep: 0,
  };

  it('advances through the steps in any order', () => {
    let profile = applyTutorialSignal(baseProfile, { type: 'walked' });
    expect(profile.tutorialStep).toBe(1);
    // Eating before showering is fine: it jumps to the next step.
    profile = applyTutorialSignal(profile, { type: 'action-completed', itemId: 'fridge' });
    expect(profile.tutorialStep).toBe(2);
    profile = applyTutorialSignal(profile, { type: 'action-completed', itemId: 'shower' });
    profile = applyTutorialSignal(profile, { type: 'action-completed', itemId: 'toilet' });
    profile = applyTutorialSignal(profile, { type: 'woke-up' });
    expect(profile.tutorialStep).toBe(TUTORIAL_STEPS.length);
    expect(profile.tutorialDone).toBe(true);
  });

  it('ignores signals after completion and unknown signals', () => {
    const done = { ...baseProfile, tutorialDone: true, tutorialStep: 5 };
    expect(applyTutorialSignal(done, { type: 'walked' })).toBe(done);
    expect(applyTutorialSignal(baseProfile, { type: 'action-completed', itemId: 'tv' })).toBe(
      baseProfile,
    );
    expect(tutorialStepForSignal({ type: 'action-completed', itemId: 'tv' })).toBe(-1);
  });

  it('skip finishes the tutorial', () => {
    const skipped = finishTutorial(baseProfile);
    expect(skipped.tutorialDone).toBe(true);
    expect(finishTutorial(skipped)).toBe(skipped);
  });
});

describe('room space', () => {
  const grid = buildBlockedGrid();

  it('blocks the borders and the furniture footprints', () => {
    expect(isBlocked(grid, 0, 8)).toBe(true);
    expect(isBlocked(grid, 21, 8)).toBe(true);
    const bed = ROOM_PLACEMENTS.find((placement) => placement.itemId === 'bed')!;
    expect(isBlocked(grid, bed.cell.x, bed.cell.y)).toBe(true);
    // The rug can be walked over.
    const rug = ROOM_PLACEMENTS.find((placement) => placement.itemId === 'rug')!;
    expect(isBlocked(grid, rug.cell.x, rug.cell.y)).toBe(false);
  });

  it('finds a walkable approach cell in front of every interactive object', () => {
    for (const placement of ROOM_PLACEMENTS) {
      if (placement.interactive === false) continue;
      const approach = approachCell(grid, placement);
      expect(approach, placement.id).not.toBeNull();
      expect(isBlocked(grid, approach!.x, approach!.y), placement.id).toBe(false);
    }
  });

  it('paths from the spawn point to the fridge and the bed', () => {
    for (const itemId of ['fridge', 'bed', 'sofa', 'toilet', 'shower']) {
      const placement = ROOM_PLACEMENTS.find((candidate) => candidate.itemId === itemId)!;
      const target = approachCell(grid, placement)!;
      const path = findRoomPath(grid, SPAWN_CELL, target);
      expect(path.length, itemId).toBeGreaterThan(0);
    }
  });

  it('every placement keeps its art size and a >= 44px tap target', () => {
    for (const placement of ROOM_PLACEMENTS) {
      expect(placement.art.w, placement.id).toBeGreaterThan(0);
      expect(placement.hit.w, placement.id).toBeGreaterThanOrEqual(44);
      expect(placement.hit.h, placement.id).toBeGreaterThanOrEqual(44);
      // The last column/row is a reserved wall margin, so a footprint may end
      // exactly on it (the shower hugs the right wall) but never go past it.
      expect(placement.cell.x + placement.footprint.w, placement.id).toBeLessThanOrEqual(
        ROOM_CELLS.cols,
      );
      expect(placement.cell.y + placement.footprint.d, placement.id).toBeLessThanOrEqual(
        ROOM_CELLS.rows,
      );
    }
  });
});

describe('appearance', () => {
  it('normalizes partial old appearances with the new fields', () => {
    const appearance = normalizeAppearance({ skin: 'skin-7', hair: 'hair-8', hairStyle: 'afro' });
    expect(appearance.skin).toBe('skin-7');
    expect(appearance.hairStyle).toBe('afro');
    expect(appearance.eyes).toBe(DEFAULT_APPEARANCE.eyes);
    expect(appearance.height).toBe(DEFAULT_APPEARANCE.height);
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
  });

  it('offers at least ten options in every creator category', () => {
    expect(SKIN_TONES.length).toBeGreaterThanOrEqual(10);
    expect(HAIR_COLORS.length).toBeGreaterThanOrEqual(10);
    expect(HAIR_STYLES.length).toBeGreaterThanOrEqual(10);
    expect(OUTFIT_STYLES.length).toBeGreaterThanOrEqual(10);
    expect(OUTFIT_COLORS.length).toBeGreaterThanOrEqual(10);
    expect(EYE_OPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(BROW_OPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(NOSE_OPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(MOUTH_OPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(ACCESSORY_OPTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('validates the creator draft', () => {
    expect(validateCharacterDraft({ name: 'Lia', traits: ['a', 'b', 'c', 'd', 'e'], aspiration: 'chef' }))
      .toEqual({ ok: true, error: null });
    expect(validateCharacterDraft({ name: 'L', traits: [], aspiration: '' }).ok).toBe(false);
    expect(
      validateCharacterDraft({ name: 'Lia', traits: ['a', 'b'], aspiration: 'chef' }).error,
    ).toBe('traits');
  });
});

describe('save v1 migration', () => {
  it('upgrades a v1 save with tutorial, action and appearance defaults', () => {
    const v1 = {
      version: 1,
      savedAt: '2026-01-01T00:00:00.000Z',
      profile: {
        id: 'player-1',
        displayName: 'Ana',
        friendCode: 'ABCD2345',
        createdAt: '2026-01-01T00:00:00.000Z',
        isGuest: true,
        tutorialDone: false,
      },
      settings: { language: 'pt-BR' },
      world: {
        clock: { totalMs: 0, speed: 1, dayLengthMs: 1_440_000 },
        character: {
          id: 'char-1',
          name: 'Lia',
          age: 24,
          gender: 'feminine',
          appearance: { skin: 'skin-3', hair: 'hair-1', hairStyle: 'bun' },
          traits: [],
          aspiration: 'chef',
          minutesLived: 0,
        },
        needs: createNeeds(),
        money: 400,
        house: { house: { id: 'house-default', name: 'house.defaultName', grid: ['....'], items: [] }, inventory: [] },
      },
      stats: { playtimeMs: 0, sessions: 1 },
    };
    const migrated = migrateSave(v1);
    expect(migrated?.version).toBe(SAVE_VERSION);
    expect(migrated?.profile.tutorialStep).toBe(0);
    expect(migrated?.profile.tutorialDone).toBe(false);
    expect(migrated?.world.action).toBeNull();
    expect(migrated?.world.position).toBeNull();
    expect(migrated?.settings.dayLengthSeconds).toBe(1440);
    expect(migrated?.world.character.appearance.skin).toBe('skin-3');
    expect(migrated?.world.character.appearance.hairStyle).toBe('bun');
    expect(migrated?.world.character.appearance.accessory).toBe('none');
    // Phase 2 fields are filled with safe defaults, never undefined.
    expect(migrated?.world.career).toBeNull();
    expect(migrated?.world.autonomous).toBe(true);
    expect(migrated?.world.emotions).toEqual([]);
    expect(migrated?.world.memories).toEqual([]);
    expect(migrated?.world.skills.cooking).toBe(0);
    expect(migrated?.world.house.inventory).toEqual([]);
    expect(migrated?.world.house.placed).toEqual([]);
    expect(migrated?.world.relationships).toEqual({});
  });

  it('drops an unknown career but keeps a valid one', () => {
    const base = createNewSave(
      {
        id: 'player-1',
        displayName: 'Ana',
        friendCode: 'ABCD2345',
        createdAt: '2026-01-01T00:00:00.000Z',
        isGuest: true,
        tutorialDone: true,
        tutorialStep: 5,
      },
      createCharacterForTest(),
      createNeeds(),
    );
    const withCareer = {
      ...base,
      world: {
        ...base.world,
        career: { career: 'programmer', level: 3, performance: 40, shiftsWorked: 8 },
      },
    };
    expect(migrateSave(withCareer)?.world.career?.level).toBe(3);
    const broken = {
      ...base,
      world: { ...base.world, career: { career: 'astronaut', level: 2 } },
    };
    expect(migrateSave(broken)?.world.career).toBeNull();
  });
});

describe('offline progress', () => {
  it('caps the simulated time at 8 in-game hours', () => {
    const start = world({ needs: createNeeds() });
    const away = simulateAway(start, 100 * 60 * 60 * 1000);
    expect(away.world.clock.totalMs - start.clock.totalMs).toBe(8 * 3_600_000);
    expect(away.world.needs.hunger).toBeLessThan(start.needs.hunger);
  });

  it('simulates short absences at the normal rate', () => {
    const start = world({ needs: createNeeds() });
    // 20 real seconds = 20 game minutes.
    const away = simulateAway(start, 20_000);
    expect(away.world.clock.totalMs - start.clock.totalMs).toBe(20 * 60_000);
  });

  it('finishes an interrupted action before applying plain decay', () => {
    const started = beginAction(world({ needs: createNeeds({ hunger: 50 }) }), 'fridge', 'eat')!;
    // A short absence: the meal completes at 4x and then normal decay resumes.
    const away = simulateAway(started.world, 30_000);
    expect(away.world.action).toBeNull();
    expect(away.world.needs.hunger).toBeGreaterThan(60);
  });
});
