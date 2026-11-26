import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CAREER_DEFINITIONS, CAREER_SKILL, shiftSalary } from '@vida/shared';
import { useGameStore } from '../gameStore';
import { storage } from '@/platform/storage';
import { seedSave } from '@/test/render';

/**
 * Phase 2 acceptance tests, driven through the real store:
 *  - the character survives a full day alone (eats when hungry, doesn't sleep
 *    at 15h with full energy);
 *  - a job pays, promotes and raises the salary;
 *  - skills level up and records a level per 100 XP;
 *  - turning autonomy off really stops the character.
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

function setWorld(patch: Record<string, unknown>): void {
  const save = useGameStore.getState().save!;
  useGameStore.setState({ save: { ...save, world: { ...save.world, ...patch } } });
}

/**
 * Runs game hours: ticks the world with real milliseconds (the same conversion
 * the PlayScreen does) and lets the AI think every ~20 game minutes when idle.
 */
function simulateGameHours(hours: number): void {
  const clock = useGameStore.getState().save!.world.clock;
  const realPerGameMs = clock.dayLengthMs / 86_400_000;
  const stepReal = 250;
  const stepGame = stepReal / realPerGameMs;
  const targetGame = hours * 3_600_000;
  let gameElapsed = 0;
  let sinceThink = 0;
  while (gameElapsed < targetGame) {
    useGameStore.getState().tickWorld(stepReal);
    gameElapsed += stepGame;
    sinceThink += stepGame;
    if (sinceThink >= 20 * 60_000) {
      sinceThink = 0;
      if (!useGameStore.getState().save!.world.action) useGameStore.getState().think();
    }
  }
}

function setClockHour(hour: number): void {
  const save = useGameStore.getState().save!;
  const dayStart = Math.floor(save.world.clock.totalMs / 86_400_000) * 86_400_000;
  useGameStore.setState({
    save: {
      ...save,
      world: { ...save.world, clock: { ...save.world.clock, totalMs: dayStart + hour * 3_600_000 } },
    },
  });
}

describe('autonomous character', () => {
  it('eats by itself when hunger is critical', () => {
    seedSave();
    setWorld({ needs: { hunger: 10, energy: 80, hygiene: 80, bladder: 80, fun: 60, social: 60, mood: 70 } });
    expect(useGameStore.getState().think()?.kind).toBe('interact');
    const action = useGameStore.getState().save!.world.action;
    expect(action).not.toBeNull();
    expect(['eat', 'cook']).toContain(action!.interactionId);
  });

  it('does not sleep at 15h with full energy', () => {
    seedSave();
    setClockHour(15);
    setWorld({ needs: { hunger: 90, energy: 100, hygiene: 90, bladder: 90, fun: 90, social: 90, mood: 90 } });
    const decision = useGameStore.getState().think();
    if (decision?.kind === 'interact') {
      expect(decision.interactionId).not.toBe('sleep');
      expect(decision.interactionId).not.toBe('nap');
    }
    expect(useGameStore.getState().save!.world.action?.interactionId).not.toBe('sleep');
  });

  it('survives a full day alone without any need reaching zero', () => {
    seedSave();
    setClockHour(8);
    setWorld({
      needs: { hunger: 55, energy: 45, hygiene: 35, bladder: 40, fun: 30, social: 50, mood: 60 },
    });
    simulateGameHours(10);
    const needs = useGameStore.getState().save!.world.needs;
    for (const [key, value] of Object.entries(needs)) {
      expect(value, `${key} reached zero`).toBeGreaterThan(0);
    }
    // It really did something during the day.
    const memories = useGameStore.getState().save!.world.memories;
    expect(memories.length).toBeGreaterThan(0);
  });

  it('stops deciding when autonomy is off', () => {
    seedSave();
    setWorld({ autonomous: false, needs: { hunger: 5, energy: 80, hygiene: 80, bladder: 80, fun: 60, social: 60, mood: 70 } });
    expect(useGameStore.getState().think()).toBeNull();
    expect(useGameStore.getState().save!.world.action).toBeNull();
  });

  it('stays quiet during the tutorial', () => {
    seedSave({ tutorialDone: false });
    setWorld({ needs: { hunger: 5, energy: 80, hygiene: 80, bladder: 80, fun: 60, social: 60, mood: 70 } });
    expect(useGameStore.getState().think()).toBeNull();
  });
});

describe('career', () => {
  it('hires, pays a shift and records the money', () => {
    const seeded = seedSave({ money: 500 });
    useGameStore.getState().startCareer('programmer');
    const career = useGameStore.getState().save!.world.career!;
    expect(career.career).toBe('programmer');
    expect(career.level).toBe(1);

    const save = useGameStore.getState().save!;
    const hour = CAREER_DEFINITIONS.programmer.shift.startHour;
    const dayStart = Math.floor(save.world.clock.totalMs / 86_400_000) * 86_400_000;
    useGameStore.setState({
      save: {
        ...save,
        world: { ...save.world, clock: { ...save.world.clock, totalMs: dayStart + hour * 3_600_000 } },
      },
    });

    const result = useGameStore.getState().workShift();
    expect(result.salary).toBe(shiftSalary({ ...career, level: 1 }));
    expect(useGameStore.getState().save!.world.money).toBe(seeded.world.money + result.salary);
    expect(useGameStore.getState().save!.world.memories.some((memory) => memory.interactionId === 'work')).toBe(true);
  });

  it('promotes on a good run and raises the salary', () => {
    seedSave();
    useGameStore.getState().startCareer('chef');
    const firstSalary = shiftSalary(useGameStore.getState().save!.world.career!);
    let promotedLevel = 0;
    for (let i = 0; i < 8; i += 1) {
      const result = useGameStore.getState().workShift();
      if (result.promoted) promotedLevel = result.level;
    }
    const career = useGameStore.getState().save!.world.career!;
    expect(career.level).toBeGreaterThan(1);
    expect(promotedLevel).toBeGreaterThan(1);
    expect(shiftSalary(career)).toBeGreaterThan(firstSalary);
  });

  it('trains the career skill (not the career id) when working', () => {
    seedSave();
    useGameStore.getState().startCareer('chef');
    const before = useGameStore.getState().save!.world.skillXp.cooking;
    for (let i = 0; i < 3; i += 1) useGameStore.getState().workShift();
    const world = useGameStore.getState().save!.world;
    expect(world.skillXp.cooking).not.toBe(before);
    // `skills['chef']` must stay untouched: the world keys skills by SkillId.
    expect(world.skills.chef).toBeUndefined();
    expect(world.skills[CAREER_SKILL.chef]).toBeGreaterThanOrEqual(1);
  });

  it('drops performance (but not the level) when a shift is missed', () => {
    seedSave();
    useGameStore.getState().startCareer('artist');
    for (let i = 0; i < 2; i += 1) useGameStore.getState().workShift();
    const before = useGameStore.getState().save!.world.career!;
    const result = useGameStore.getState().workShift({ missed: true });
    const after = useGameStore.getState().save!.world.career!;
    expect(result.salary).toBe(0);
    expect(after.level).toBe(before.level);
    expect(after.performance).toBeLessThan(before.performance);
    expect(after.missedLastShift).toBe(true);
  });
});

describe('skills', () => {
  it('levels up every 100 xp and caps at 10', () => {
    seedSave();
    expect(useGameStore.getState().addSkillXp('cooking', 40)).toBe(0);
    expect(useGameStore.getState().addSkillXp('cooking', 70)).toBe(1);
    expect(useGameStore.getState().save!.world.skillXp.cooking).toBe(10);
    expect(useGameStore.getState().addSkillXp('cooking', 2000)).toBe(10);
    expect(useGameStore.getState().save!.world.skills.cooking).toBe(10);
  });
});
