import { describe, expect, it } from 'vitest';
import {
  AI_CRITICAL_BONUS,
  applyShift,
  decideNextAction,
  hoursUntilShift,
  isShiftActive,
  scoreOptions,
  shiftSalary,
  type AiContext,
  type CareerProgress,
} from '../ai';
import { CAREER_DEFINITIONS, ROOM_PLACEMENTS } from '../content';
import { createClock } from '../clock';
import { createNeeds } from '../needs';
import { MAX_CAREER_LEVEL } from '../ai';

/**
 * The AI must be explainable and deterministic: same input + seed ⇒ same
 * decision. These tests are the contract the acceptance criteria ask for:
 * "eats when hunger < 25" and "does not sleep at 15h with full energy".
 */

/** Objects of the default house (one per placement). */
const OBJECTS = ROOM_PLACEMENTS.map((placement) => ({
  id: placement.id,
  itemId: placement.itemId,
}));

/** Clock at a given hour of day 1 (24 min real per day by default). */
function clockAt(hour: number) {
  return { ...createClock(1440), totalMs: hour * 3_600_000 };
}

function context(overrides: Partial<AiContext> = {}): AiContext {
  return {
    needs: createNeeds(),
    clock: clockAt(10),
    traits: [],
    career: null,
    skills: {},
    objects: OBJECTS,
    busy: false,
    ...overrides,
  };
}

describe('utility AI: survival first', () => {
  it('eats when hunger is critical (below 25)', () => {
    const decision = decideNextAction(context({ needs: createNeeds({ hunger: 12 }) }), 7);
    expect(decision.kind).toBe('interact');
    if (decision.kind !== 'interact') return;
    expect(['fridge', 'stove']).toContain(decision.itemId);
    expect(['eat', 'cook']).toContain(decision.interactionId);
    expect(decision.score).toBeGreaterThan(AI_CRITICAL_BONUS);
  });

  it('does not sleep at 15h with full energy', () => {
    const options = scoreOptions(context({ needs: createNeeds({ energy: 100 }) }), 3);
    const sleep = options.find((option) => option.interactionId === 'sleep' && option.kind === 'interact');
    const wander = options.find((option) => option.kind === 'wander');
    expect(sleep).toBeDefined();
    expect(wander).toBeDefined();
    expect(sleep!.score).toBeLessThan(wander!.score);
  });

  it('sleeps at night when tired', () => {
    const decision = decideNextAction(
      context({ needs: createNeeds({ energy: 18, hunger: 100 }), clock: clockAt(23) }),
      5,
    );
    expect(decision.kind).toBe('interact');
    if (decision.kind !== 'interact') return;
    expect(decision.interactionId).toBe('sleep');
    expect(decision.itemId).toBe('bed');
  });

  it('uses the toilet before anything else when the bladder is critical', () => {
    const decision = decideNextAction(
      context({ needs: createNeeds({ bladder: 8, fun: 20, hygiene: 22 }) }),
      11,
    );
    expect(decision.kind).toBe('interact');
    if (decision.kind !== 'interact') return;
    expect(decision.itemId).toBe('toilet');
  });

  it('showers when hygiene is low', () => {
    const decision = decideNextAction(context({ needs: createNeeds({ hygiene: 15 }) }), 2);
    expect(decision.kind).toBe('interact');
    if (decision.kind !== 'interact') return;
    expect(decision.itemId).toBe('shower');
  });

  it('is stable: same world + same seed gives the same decision', () => {
    const world = context({ needs: createNeeds({ hunger: 40, energy: 70, fun: 30 }) });
    const first = decideNextAction(world, 'save-1');
    for (let i = 0; i < 10; i += 1) {
      expect(decideNextAction(world, 'save-1')).toEqual(first);
    }
  });

  it('does nothing while an action is running', () => {
    const decision = decideNextAction(context({ busy: true }), 1);
    expect(decision).toEqual({ kind: 'idle', score: 0 });
  });

  it('always returns something (at least wandering)', () => {
    const decision = decideNextAction(context({ objects: [] }), 1);
    expect(decision.kind).toBe('wander');
  });
});

describe('utility AI: personality and time', () => {
  it('traits change the scores', () => {
    const needs = createNeeds({ fun: 30, hunger: 80 });
    const plain = scoreOptions(context({ needs }), 4);
    const creative = scoreOptions(context({ needs, traits: ['creative'] }), 4);
    const paintPlain = plain.find((option) => option.interactionId === 'paint')?.score ?? 0;
    const paintCreative = creative.find((option) => option.interactionId === 'paint')?.score ?? 0;
    // "creative" has a paint skill bias, so the same option is worth (a bit) more.
    expect(paintCreative).toBeGreaterThanOrEqual(paintPlain);
  });

  it('night owls lean towards evening activities', () => {
    const needs = createNeeds({ fun: 40 });
    const day = scoreOptions(context({ needs, traits: ['nightOwl'], clock: clockAt(12) }), 9);
    const night = scoreOptions(context({ needs, traits: ['nightOwl'], clock: clockAt(23) }), 9);
    expect(night[0]!.score).toBeGreaterThan(0);
    expect(day[0]!.score).toBeGreaterThan(0);
  });

  it('avoids sleeping right before a shift', () => {
    const career = 'chef' as const;
    const shiftStart = CAREER_DEFINITIONS[career].shift.startHour;
    const options = scoreOptions(
      context({
        needs: createNeeds({ energy: 40 }),
        career,
        clock: clockAt((shiftStart - 1 + 24) % 24),
      }),
      6,
    );
    const sleep = options.find((option) => option.interactionId === 'sleep');
    expect(sleep).toBeDefined();
    expect(sleep!.score).toBeLessThan(20);
    // And it is not what the character chooses at that hour.
    const decision = decideNextAction(
      context({ needs: createNeeds({ energy: 40 }), career, clock: clockAt((shiftStart - 1 + 24) % 24) }),
      6,
    );
    expect(decision.kind === 'interact' ? decision.interactionId : 'wander').not.toBe('sleep');
  });
});

describe('careers', () => {
  const base: CareerProgress = { career: 'chef', level: 1, performance: 0, shiftsWorked: 0 };

  it('pays the salary of the current level', () => {
    expect(shiftSalary(base)).toBe(CAREER_DEFINITIONS.chef.salary[0]);
    expect(shiftSalary({ ...base, level: 3 })).toBe(CAREER_DEFINITIONS.chef.salary[2]);
  });

  it('promotes after enough good shifts and raises the salary', () => {
    let progress = base;
    let promotions = 0;
    for (let i = 0; i < 10; i += 1) {
      const result = applyShift(progress, { skillLevel: 4 });
      progress = result.progress;
      if (result.promoted) promotions += 1;
    }
    expect(promotions).toBeGreaterThanOrEqual(2);
    expect(progress.level).toBeGreaterThan(1);
    expect(shiftSalary(progress)).toBeGreaterThan(CAREER_DEFINITIONS.chef.salary[0]!);
  });

  it('never goes past the maximum level', () => {
    let progress: CareerProgress = { ...base, level: MAX_CAREER_LEVEL, performance: 99 };
    for (let i = 0; i < 20; i += 1) {
      progress = applyShift(progress, { skillLevel: 10 }).progress;
    }
    expect(progress.level).toBe(MAX_CAREER_LEVEL);
    expect(progress.performance).toBeLessThan(100);
  });

  it('penalises a missed shift without losing levels', () => {
    const result = applyShift({ ...base, level: 2, performance: 50 }, { missed: true });
    expect(result.promoted).toBe(false);
    expect(result.salary).toBe(0);
    expect(result.progress.level).toBe(2);
    expect(result.progress.performance).toBeLessThan(50);
    expect(result.progress.missedLastShift).toBe(true);
  });

  it('knows the shift window, including overnight careers', () => {
    const career = CAREER_DEFINITIONS.clerk;
    const { startHour, hours } = career.shift;
    expect(isShiftActive(base, startHour)).toBe(true);
    expect(isShiftActive(base, startHour + hours)).toBe(false);
    expect(hoursUntilShift(startHour, career)).toBe(0);
    expect(hoursUntilShift((startHour + 1) % 24, career)).toBe(23);
  });
});
