/**
 * Autonomous behaviour ("Utility AI").
 *
 * The character is not a chatbot and does not need a neural network: a life sim
 * works great with **utility scoring** — every possible action gets a score,
 * the highest wins, and we add a little personality and noise so the same
 * situation does not always produce the same move.
 *
 * Design rules that keep this honest:
 *  - it is a pure function: same world + same seed ⇒ same decision;
 *  - it only knows what a player could see (needs, clock, traits, skills, the
 *    objects in the house and their catalog effects);
 *  - it respects survival: a critical need always beats "have fun";
 *  - it obeys "quiet hours": no vacuuming at 3 a.m. while the player watches.
 *
 * Scores are expressed in "need points recovered per game hour", so an action
 * that takes 10 minutes is not unfairly better than one that takes 2 hours.
 */
import {
  autoAssignableInteractions,
  careerNameKey,
  CAREER_DEFINITIONS,
  CAREER_SKILL,
  itemById,
  traitById,
  type CareerDefinition,
  type CareerId,
  type InteractionId,
} from './content';
import { interactionsFor } from './simulation';
import { readClock, type GameClock } from './clock';
import { NEED_PRIORITY, type NeedKey, type Needs } from './needs';
import { createRng, hashString, type Rng } from './rng';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface AiObject {
  /** Placement (instance) id, e.g. "item-fridge". */
  id: string;
  /** Catalog item id, e.g. "fridge". */
  itemId: string;
}

export interface AiContext {
  needs: Needs;
  clock: GameClock;
  /** Trait ids chosen in the creator (affect weights). */
  traits: readonly string[];
  /** Career currently held, if any (influences the "go to work" option). */
  career?: CareerId | null;
  /** Skill levels 0..10, used to prefer what the character is good at. */
  skills?: Readonly<Record<string, number>>;
  /** Placed objects that can be used right now. */
  objects: readonly AiObject[];
  /** True when the character is already busy (AI must then do nothing). */
  busy?: boolean;
  /** Game hour of the last sleep, to avoid napping right after waking. */
  lastSleepHour?: number | null;
}

export type AiDecision =
  | { kind: 'interact'; itemId: string; interactionId: InteractionId; score: number }
  | { kind: 'wander'; score: number }
  | { kind: 'idle'; score: number };

export interface ScoredOption {
  kind: 'interact' | 'wander';
  itemId?: string;
  interactionId?: InteractionId;
  score: number;
  /** Why it won — useful for the "thought bubble" and for tests. */
  reasons: string[];
}

/* -------------------------------------------------------------------------- */
/*                                 TUNING                                     */
/* -------------------------------------------------------------------------- */

/** Below this a need is an emergency: survival beats everything else. */
export const AI_CRITICAL_NEED = 25;
/** Below this the need is worth a detour. */
export const AI_LOW_NEED = 55;
/** A critical need plus this bonus guarantees it wins over fun/mood actions. */
export const AI_CRITICAL_BONUS = 120;
/** Bonus for matching the character's aspiration ("chef" loves the stove). */
export const AI_ASPIRATION_BONUS = 6;
/** How many options the AI considers per interaction (keeps it cheap). */
export const AI_MAX_OPTIONS = 40;

/** Needs an interaction may not fix alone (mood is the aggregate). */
function scoreNeedGain(
  effects: Partial<Record<string, number>>,
  needs: Needs,
  weight: number,
): {
  gain: number;
  lowCriticalNeed: NeedKey | null;
  criticalGain: number;
  reasons: string[];
} {
  let total = 0;
  let lowCriticalNeed: NeedKey | null = null;
  let criticalGain = 0;
  const reasons: string[] = [];
  for (const need of NEED_PRIORITY) {
    const amount = effects[need] ?? 0;
    if (amount <= 0) continue;
    // Headroom: curing hunger from 90 is worth almost nothing.
    const headroom = (100 - needs[need]) / 100;
    const isCritical = needs[need] < AI_CRITICAL_NEED;
    const urgency = isCritical ? 1 : needs[need] < AI_LOW_NEED ? 0.65 : 0.35;
    const value = amount * headroom * urgency * weight;
    total += value;
    if (isCritical) {
      // Only the part of the effect that hits a *critical* need may claim the
      // emergency bonus: a coffee that adds 3 mood must not outrank a toilet.
      criticalGain += value;
      if (!lowCriticalNeed || needs[need] < needs[lowCriticalNeed]) lowCriticalNeed = need;
    }
    if (value > 0.5) reasons.push(`${need}${isCritical ? '!' : ''}+${Math.round(amount)}`);
  }
  return { gain: total, lowCriticalNeed, criticalGain, reasons };
}

/** Hours until a career shift starts (0..24), or null when there is no career. */
export function hoursUntilShift(hour: number, career: CareerDefinition): number {
  const delta = (career.shift.startHour - hour + 24) % 24;
  return delta;
}

/* -------------------------------------------------------------------------- */
/*                                  SCORING                                   */
/* -------------------------------------------------------------------------- */

/**
 * Scores every object × interaction in the house.
 *
 * The formula is intentionally readable, not clever:
 *   score = needs recovered + trait bonus + skill bonus + aspiration bonus
 *           − effort (distance-ish) − time-of-day penalty
 * A critical need adds a big constant so "pee" wins over "watch TV".
 */
export function scoreOptions(
  context: AiContext,
  seed: number | string = 1,
  rng: Rng = createRng(typeof seed === 'string' ? hashString(seed) : seed >>> 0),
): ScoredOption[] {
  const clock = readClock(context.clock);
  const hour = clock.hour;
  const results: ScoredOption[] = [];
  const traitIds = new Set(context.traits);
  const traitBonus = new Set<string>();
  let aspirationWeight = 1;
  for (const traitId of traitIds) {
    const trait = traitById(traitId);
    if (trait?.skillBias) traitBonus.add(trait.skillBias);
    // Night owls are happier doing things late; early birds, early.
    if (traitId === 'nightOwl' && (hour >= 21 || hour < 3)) aspirationWeight += 0.15;
    if (traitId === 'earlyBird' && hour >= 6 && hour < 10) aspirationWeight += 0.15;
    if (traitId === 'lazy') aspirationWeight -= 0.1;
    if (traitId === 'competitive') aspirationWeight += 0.12;
  }
  aspirationWeight = Math.max(0.7, Math.min(1.4, aspirationWeight));

  const night = hour >= 22 || hour < 6;

  for (const object of context.objects.slice(0, AI_MAX_OPTIONS)) {
    const item = itemById(object.itemId);
    if (!item) continue;
    for (const interactionId of interactionsFor(item.id)) {
      if (!autoAssignableInteractions(item.id).includes(interactionId)) continue;
      const effects = item.effects[interactionId] ?? [];
      const effectMap: Partial<Record<string, number>> = {};
      for (const effect of effects) {
        effectMap[effect.need] = (effectMap[effect.need] ?? 0) + effect.amount;
      }
      const { gain, lowCriticalNeed, criticalGain, reasons } = scoreNeedGain(
        effectMap,
        context.needs,
        1,
      );
      const duration = item.durations[interactionId] ?? 30;
      let score = gain;

      // Skills: doing what you are good at feels better (and trains it).
      const skillLevel = item.skill ? (context.skills?.[item.skill] ?? 0) : 0;
      if (item.skill && traitBonus.has(item.skill)) score += 3;
      score += Math.min(4, skillLevel * 0.4);

      // Career: sleeping during a shift window is a bad idea; the AI is not
      // allowed to skip work on a whim (the player must cancel).
      let shiftRisk = 0;
      if (context.career) {
        const career = CAREER_DEFINITIONS[context.career];
        const until = hoursUntilShift(hour, career);
        if (until < 1.5 && (interactionId === 'sleep' || interactionId === 'nap')) shiftRisk = 60;
        if (until < 0.75 && interactionId !== 'sleep') shiftRisk = 10;
      }
      score -= shiftRisk;

      // Sleep hygiene: no big naps right after waking up, none during a shift.
      if (interactionId === 'sleep' && !night) score -= 12;
      if (interactionId === 'sleep' && night) score += 10;
      if (interactionId === 'nap' && night) score -= 8;

      // Emergency: the action meaningfully fixes a critical need.
      // `criticalGain` uses the same units as `score`, so a tiny 3-mood effect
      // on a critical mood gets a proportionally smaller bonus.
      if (criticalGain > 2) {
        score += AI_CRITICAL_BONUS * Math.min(1, criticalGain / 15);
      }

      // Aspiration flavour: the chef hangs around the stove, the artist paints.
      if (context.career && item.skill === CAREER_SKILL[context.career]) {
        score += AI_ASPIRATION_BONUS * aspirationWeight;
      }

      // Distance/effort: long actions are penalised a little so short fixes win.
      score -= Math.min(4, duration / 45);

      // Personality noise: identical worlds with different seeds choose slightly
      // differently, which is what makes the character feel alive.
      score += rng() * 2.5;

      // Options with a negative score stay in the list (with 0) so the UI and
      // the tests can explain "why not"; `results[0]` is still the best one.
      results.push({
        kind: 'interact',
        itemId: item.id,
        interactionId,
        score: Number(Math.max(0, score).toFixed(2)),
        reasons: [...reasons, lowCriticalNeed ? `critical:${lowCriticalNeed}` : ''].filter(Boolean),
      });
    }
  }

  // Wandering is the fallback: fun/novelty, never beats a real need.
  const wanderScore =
    4 +
    (100 - context.needs.fun) * 0.05 +
    (100 - context.needs.social) * 0.03 +
    (night ? -2 : 0) +
    rng() * 2;
  results.push({ kind: 'wander', score: Number(Math.max(0.5, wanderScore).toFixed(2)), reasons: ['fallback'] });

  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Picks what the character should do next. Pure + deterministic per seed. */
export function decideNextAction(context: AiContext, seed: number | string = 1): AiDecision {
  if (context.busy) return { kind: 'idle', score: 0 };
  const numericSeed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const options = scoreOptions(context, numericSeed);
  const best = options[0];
  if (!best) return { kind: 'idle', score: 0 };
  if (best.kind === 'wander') return { kind: 'wander', score: best.score };
  return {
    kind: 'interact',
    itemId: best.itemId ?? '',
    interactionId: best.interactionId as InteractionId,
    score: best.score,
  };
}

/* -------------------------------------------------------------------------- */
/*                          CAREER / WORK ASSIGNMENT                          */
/* -------------------------------------------------------------------------- */

export interface CareerProgress {
  career: CareerId;
  /** 1..5 */
  level: number;
  /** 0..100, grows with worked shifts. */
  performance: number;
  /** Shifts worked, used for the performance curve. */
  shiftsWorked: number;
  /** True when the character missed the last shift. */
  missedLastShift?: boolean;
}

export const MAX_CAREER_LEVEL = 5;
export const PERFORMANCE_PER_SHIFT = 22;
export const PERFORMANCE_PENALTY_MISSED = 15;

/** Salary of one shift at the current level. */
export function shiftSalary(progress: CareerProgress): number {
  const career = CAREER_DEFINITIONS[progress.career];
  const index = Math.min(career.salary.length, Math.max(1, progress.level)) - 1;
  return career.salary[index] ?? career.salary[0]!;
}

/** Is the character inside the work window right now? */
export function isShiftActive(progress: CareerProgress, hour: number): boolean {
  const career = CAREER_DEFINITIONS[progress.career];
  const start = career.shift.startHour;
  const end = start + career.shift.hours;
  if (end <= 24) return hour >= start && hour < end;
  return hour >= start || hour < end - 24;
}

/**
 * Applies a finished shift.
 *
 * The rule for promotion is deliberately simple to explain in game: every
 * shift adds performance; at 100 the character is promoted and performance
 * resets. Missing a shift costs performance (but never a level).
 */
export function applyShift(
  progress: CareerProgress,
  options: { missed?: boolean; skillLevel?: number } = {},
): { progress: CareerProgress; salary: number; promoted: boolean } {
  if (options.missed) {
    return {
      progress: {
        ...progress,
        performance: Math.max(0, progress.performance - PERFORMANCE_PENALTY_MISSED),
        missedLastShift: true,
      },
      salary: 0,
      promoted: false,
    };
  }
  const skill = Math.min(10, Math.max(0, options.skillLevel ?? 0));
  const gain = PERFORMANCE_PER_SHIFT + skill * 1.5;
  let performance = progress.performance + gain;
  let level = progress.level;
  let promoted = false;
  while (performance >= 100 && level < MAX_CAREER_LEVEL) {
    performance -= 100;
    level += 1;
    promoted = true;
  }
  if (performance >= 100) performance = 99; // level 5 is the ceiling
  const next: CareerProgress = {
    career: progress.career,
    level,
    performance: Math.round(performance),
    shiftsWorked: progress.shiftsWorked + 1,
    missedLastShift: false,
  };
  return { progress: next, salary: shiftSalary({ ...next, level }), promoted };
}

/** Label for the HUD ("Chef • Nível 2"). */
export function careerLabelKey(progress: CareerProgress): { career: string; level: number } {
  return { career: careerNameKey(progress.career), level: progress.level };
}
