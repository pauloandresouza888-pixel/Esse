import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  actionDurationMs,
  createNeeds,
  interactionsFor,
  placementForItem,
  TUTORIAL_STEPS,
} from '@vida/shared';
import { useGameStore } from '../gameStore';
import { storage } from '@/platform/storage';
import { seedSave } from '@/test/render';

/**
 * Phase 1 acceptance tests, end to end through the real store.
 *
 * These are the "wake up → eat → sleep" journeys from the phase plan, driven by
 * the same functions the game uses (no mocks of the simulation rules):
 *  - a critical need is visible and has a fix;
 *  - eating restores hunger and the action finishes on its own;
 *  - sleeping recovers energy, wakes the character up and leaves it hungry;
 *  - closing the app and reopening restores needs, clock and position.
 */
const initial = { bootStatus: 'idle' as const, save: null, storageWarning: null };

beforeEach(() => {
  storage.clear();
  window.localStorage.clear();
  useGameStore.setState(initial);
});

afterEach(() => {
  storage.clear();
  window.localStorage.clear();
  useGameStore.setState(initial);
});

/** Runs the simulation for `realMs` in small ticks, like the game loop does. */
function runFor(realMs: number, stepMs = 250): void {
  let remaining = realMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    useGameStore.getState().tickWorld(step);
    remaining -= step;
  }
}

/**
 * Real milliseconds an in-game action takes at its own speed.
 * With the default 24-minute day, one game hour = 2.5 real seconds; a 25-minute
 * meal at 4x therefore lasts ~1.5 real seconds.
 */
function realMsForAction(gameMs: number, speed: number): number {
  const clock = useGameStore.getState().save!.world.clock;
  return (gameMs * clock.dayLengthMs) / (86_400_000 * speed);
}

function setNeeds(patch: Partial<ReturnType<typeof createNeeds>>): void {
  const save = useGameStore.getState().save!;
  useGameStore.setState({ save: { ...save, world: { ...save.world, needs: { ...save.world.needs, ...patch } } } });
}

describe('life loop: wake up → eat → sleep', () => {
  it('starts the character hungry with a fix in the house', () => {
    seedSave();
    setNeeds({ hunger: 12, energy: 30, bladder: 90 });

    // Hunger is critical (< 20) and the fridge is what fixes it.
    const hunger = useGameStore.getState().save!.world.needs.hunger;
    expect(hunger).toBeLessThan(20);
    const fridge = placementForItem('fridge');
    expect(fridge).toBeDefined();
    expect(interactionsFor(fridge!.itemId)).toContain('eat');
  });

  it('eats until full and completes the action without input', () => {
    seedSave();
    setNeeds({ hunger: 10 });
    const before = useGameStore.getState().save!.world.needs.hunger;

    expect(useGameStore.getState().startInteraction('fridge', 'eat')).toBe(true);
    const action = useGameStore.getState().save!.world.action!;
    expect(action.interactionId).toBe('eat');

    // The action needs `durationMs` of *in-game* time (4x speed while busy).
    const duration = actionDurationMs('fridge', 'eat')!;
    const realMs = realMsForAction(duration, action.speed);
    runFor(realMs + 1000);

    const save = useGameStore.getState().save!;
    expect(save.world.action).toBeNull();
    // hunger 10 + 38 from the catalog meal, minus the normal decay while eating.
    expect(save.world.needs.hunger).toBeGreaterThan(before);
    expect(save.world.needs.hunger).toBeGreaterThan(35);
  });

  it('sleeps 8 in-game hours, recovers energy and wakes up hungry', () => {
    seedSave();
    setNeeds({ energy: 25, hunger: 70, bladder: 92 });

    expect(useGameStore.getState().startInteraction('bed', 'sleep')).toBe(true);
    const gameMsBefore = useGameStore.getState().save!.world.clock.totalMs;

    // Sleep runs at 30x: 8 h of game time = 8 * 60 min / 30 = 16 min... which
    // the rules cap earlier — energy reaching 96 or 480 in-game minutes ends it.
    // We advance in chunks and stop as soon as the action is gone.
    let guard = 0;
    while (useGameStore.getState().save!.world.action && guard < 4000) {
      useGameStore.getState().tickWorld(250);
      guard += 1;
    }

    const save = useGameStore.getState().save!;
    expect(save.world.action).toBeNull();
    expect(save.world.needs.energy).toBeGreaterThanOrEqual(90);
    // Waking up after a long sleep makes the character hungry.
    expect(save.world.needs.hunger).toBeLessThan(70);

    // The night really moved the in-game clock forward (at least one hour).
    const elapsedGameMin = (save.world.clock.totalMs - gameMsBefore) / 60_000;
    expect(elapsedGameMin).toBeGreaterThanOrEqual(60);
  });

  it('keeps energy recovering but stops on a manual wake up', () => {
    seedSave();
    setNeeds({ energy: 20, hunger: 100 });
    useGameStore.getState().startInteraction('bed', 'sleep');
    runFor(4000);
    const midSleep = useGameStore.getState().save!.world.needs.energy;
    expect(midSleep).toBeGreaterThan(20);

    useGameStore.getState().cancelInteraction();
    expect(useGameStore.getState().save!.world.action).toBeNull();
    const afterWake = useGameStore.getState().save!.world.needs.energy;
    runFor(2000);
    // Awake, energy now decays instead of growing.
    expect(useGameStore.getState().save!.world.needs.energy).toBeLessThan(afterWake + 0.5);
  });

  it('advances the tutorial when the player performs the steps', () => {
    seedSave({ tutorialDone: false });
    expect(useGameStore.getState().save!.profile.tutorialStep).toBe(0);
    expect(TUTORIAL_STEPS[0]!.id).toBe('move');

    useGameStore.getState().signalTutorial({ type: 'walked' });
    expect(useGameStore.getState().save!.profile.tutorialStep).toBe(1);

    useGameStore.getState().signalTutorial({ type: 'action-completed', itemId: 'fridge' });
    expect(useGameStore.getState().save!.profile.tutorialStep).toBe(2);

    useGameStore.getState().signalTutorial({ type: 'action-completed', itemId: 'shower' });
    expect(useGameStore.getState().save!.profile.tutorialStep).toBe(3);
    useGameStore.getState().signalTutorial({ type: 'action-completed', itemId: 'toilet' });
    useGameStore.getState().signalTutorial({ type: 'woke-up' });

    const profile = useGameStore.getState().save!.profile;
    expect(profile.tutorialStep).toBe(TUTORIAL_STEPS.length);
    expect(profile.tutorialDone).toBe(true);
  });

  it('persists needs, clock and position across an app restart', () => {
    seedSave();
    setNeeds({ energy: 44.5, hunger: 61.25 });
    useGameStore.getState().setPosition(6, 9);
    const before = useGameStore.getState().save!;
    useGameStore.getState().flushSave();

    // Simulate a full app restart: memory is wiped, localStorage is not.
    useGameStore.setState(initial);
    useGameStore.getState().load();

    const after = useGameStore.getState().save!;
    expect(after.world.position).toEqual({ x: 6, y: 9 });
    // Needs may move a little due to the offline catch-up, never backwards to
    // the starting values.
    expect(after.world.needs.energy).toBeLessThanOrEqual(before.world.needs.energy);
    expect(after.world.needs.energy).toBeGreaterThan(30);
    expect(after.world.clock.totalMs).toBeGreaterThanOrEqual(before.world.clock.totalMs);
  });

  it('caps the offline catch-up so a week away is not a week of decay', () => {
    seedSave({ settings: { dayLengthSeconds: 1440 } });
    setNeeds({ hunger: 100, energy: 100 });
    const save = useGameStore.getState().save!;
    // Pretend the app was closed a week ago. The save is written straight to
    // storage because `flushSave` would stamp it with the current time.
    const old = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const stale = { ...save, savedAt: old };
    storage.writeSave(JSON.stringify(stale));

    useGameStore.setState(initial);
    useGameStore.getState().load();

    const needs = useGameStore.getState().save!.world.needs;
    // 8 in-game hours of decay at most (hunger drops 10/hour), never a week.
    expect(needs.hunger).toBeGreaterThan(0);
    expect(needs.hunger).toBeLessThanOrEqual(100 - 8 * 10 + 1);
    expect(needs.hunger).toBeGreaterThan(100 - 8 * 10 - 5);
    expect(needs.energy).toBeGreaterThan(0);
  });
});
