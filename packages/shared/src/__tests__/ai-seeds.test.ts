import { describe, expect, it } from 'vitest';
import {
  AI_CRITICAL_NEED,
  decideNextAction,
  ROOM_PLACEMENTS,
  scoreOptions,
  type AiContext,
} from '../index';

/** Objects the AI may use in the default room. */
const objects = ROOM_PLACEMENTS.filter((placement) => placement.interactive !== false).map(
  (placement) => ({ id: placement.id, itemId: placement.itemId }),
);

function context(overrides: Partial<AiContext['needs']> = {}, hour = 9): AiContext {
  const totalMs = hour * 3_600_000;
  return {
    needs: { hunger: 80, energy: 80, hygiene: 80, bladder: 80, fun: 80, social: 80, mood: 80, ...overrides },
    clock: { totalMs, speed: 1, dayLengthMs: 1_440_000 },
    traits: ['cheerful', 'creative'],
    career: null,
    skills: { cooking: 0, programming: 0 },
    objects,
  };
}

describe('deterministic AI (fixed seeds)', () => {
  it('same seed, same world => same ranking', () => {
    const ctx = context({ hunger: 20, energy: 60 });
    const a = scoreOptions(ctx, 'ana:120');
    const b = scoreOptions(ctx, 'ana:120');
    expect(a).toEqual(b);
  });

  it('different seeds may shuffle the noise but not the winner kind', () => {
    const ctx = context({ hunger: 12 });
    const a = decideNextAction(ctx, 'seed-a');
    const b = decideNextAction(ctx, 'seed-b');
    if (a.kind === 'interact' && b.kind === 'interact') {
      // Both must fix hunger (eat/cook), never sleep or wander.
      expect(['eat', 'cook']).toContain(a.interactionId);
      expect(['eat', 'cook']).toContain(b.interactionId);
    } else {
      throw new Error(`hunger emergency was not handled: ${a.kind}/${b.kind}`);
    }
  });

  it('eats when hunger is below the critical threshold', () => {
    const ctx = context({ hunger: AI_CRITICAL_NEED - 5 });
    const decision = decideNextAction(ctx, 42);
    expect(decision.kind).toBe('interact');
    if (decision.kind === 'interact') expect(['eat', 'cook']).toContain(decision.interactionId);
  });

  it('never sleeps at 15h with full energy', () => {
    // At 15h the character may still tidy up or relax, but the bed is not an
    // option: full energy makes sleep worth almost nothing and daytime adds
    // the "no naps during the day" penalty.
    const ctx = context({ energy: 100, hunger: 95 }, 15);
    const decision = decideNextAction(ctx, 7);
    if (decision.kind === 'interact') expect(decision.interactionId).not.toBe('sleep');
    const scoreList = scoreOptions(ctx, 7);
    const best = scoreList[0];
    expect(best?.interactionId).not.toBe('sleep');
    const sleepCeiling = scoreList.find((option) => option.interactionId === 'sleep');
    if (sleepCeiling) expect(sleepCeiling.score).toBeLessThan(best?.score ?? 0);
  });

  it('prefers the bed at night when tired', () => {
    const ctx = context({ energy: 15 }, 23);
    const decision = decideNextAction(ctx, 99);
    expect(decision.kind).toBe('interact');
    if (decision.kind === 'interact') expect(decision.interactionId).toBe('sleep');
  });
});
