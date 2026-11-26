/**
 * World simulation.
 *
 * The single place that knows how a slice of *real* time becomes: clock
 * progress, need decay, and progress of the current interaction. It is a pure
 * function (`advanceWorld`) so the client, the tests and the future
 * authoritative server all run the exact same rules.
 *
 * Two speeds exist:
 *  - normal world: 1x (one game hour = one real minute with the default day);
 *  - during an action: 4x, so a 25-game-minute meal takes ~6 real seconds;
 *  - during sleep: 30x, so a full night is a few real seconds.
 * The speed only affects how fast game time flows; all needs keep using game
 * hours, which is what keeps the simulation deterministic.
 */
import { GAME_DAY_MS, realMsToGameMs, type GameClock } from './clock';
import { itemById, type InteractionId } from './content';
import {
  clampNeed,
  criticalNeeds,
  decayRate,
  NEED_KEYS,
  type NeedKey,
  type NeedModifiers,
  type Needs,
} from './needs';

/** Real-time multiplier while a regular interaction runs. */
export const ACTION_SPEED = 4;
/** Real-time multiplier while the character sleeps. */
export const SLEEP_SPEED = 30;
/** Energy at which the character wakes up on its own. */
export const SLEEP_WAKE_ENERGY = 96;
/** Hunger at which the character gets up to eat. */
export const SLEEP_WAKE_HUNGER = 15;
/** Hard cap for a single simulation step (protects against huge tab deltas). */
export const MAX_STEP_REAL_MS = 60_000;

export type WakeReason = 'energy' | 'hunger' | 'duration' | 'manual';

export interface ActiveAction {
  itemId: string;
  interactionId: InteractionId;
  /** Clock value (in-game ms) when the action started. */
  startedAtMs: number;
  /** Total in-game duration. */
  durationMs: number;
  /** Real-time multiplier applied while it runs. */
  speed: number;
  /** Total need effect for the whole duration (negative = drains). */
  effects: Partial<Record<NeedKey, number>>;
}

/** Minimal shape the simulation needs; `WorldState` satisfies it. */
export interface SimWorld {
  clock: GameClock;
  needs: Needs;
  action: ActiveAction | null;
}

export type SimEvent =
  | { type: 'action-started'; itemId: string; interactionId: InteractionId }
  | { type: 'action-completed'; itemId: string; interactionId: InteractionId; wokeReason?: WakeReason }
  | { type: 'action-cancelled'; itemId: string; interactionId: InteractionId }
  | { type: 'need-critical'; need: NeedKey }
  | { type: 'day-changed'; day: number };

/** In-game duration of an interaction, or null when the catalog has none. */
export function actionDurationMs(itemId: string, interactionId: InteractionId): number | null {
  const item = itemById(itemId);
  const minutes = item?.durations[interactionId];
  if (!item || typeof minutes !== 'number' || minutes <= 0) return null;
  return minutes * 60_000;
}

/** Sums the catalog effects of one interaction into a per-need total. */
export function collectEffects(
  itemId: string,
  interactionId: InteractionId,
): Partial<Record<NeedKey, number>> {
  const item = itemById(itemId);
  const list = item?.effects[interactionId] ?? [];
  const totals: Partial<Record<NeedKey, number>> = {};
  for (const effect of list) {
    totals[effect.need] = (totals[effect.need] ?? 0) + effect.amount;
  }
  return totals;
}

/** Interactions the catalog offers for an item (primary action first). */
export function interactionsFor(itemId: string): InteractionId[] {
  const item = itemById(itemId);
  if (!item) return [];
  const list = [item.primaryAction, ...(item.actions ?? [])];
  return [...new Set(list)];
}

/**
 * Starts an interaction. Returns null when the catalog does not define a
 * duration for it (nothing would happen, so the UI should not offer it).
 */
export function beginAction<W extends SimWorld>(
  world: W,
  itemId: string,
  interactionId: InteractionId,
): { world: W; action: ActiveAction } | null {
  const durationMs = actionDurationMs(itemId, interactionId);
  if (durationMs === null) return null;
  const action: ActiveAction = {
    itemId,
    interactionId,
    startedAtMs: world.clock.totalMs,
    durationMs,
    speed: interactionId === 'sleep' ? SLEEP_SPEED : ACTION_SPEED,
    effects: collectEffects(itemId, interactionId),
  };
  return { world: { ...world, action }, action };
}

export function cancelAction<W extends SimWorld>(world: W): { world: W; events: SimEvent[] } {
  if (!world.action) return { world, events: [] };
  return {
    world: { ...world, action: null },
    events: [
      {
        type: 'action-cancelled',
        itemId: world.action.itemId,
        interactionId: world.action.interactionId,
      },
    ],
  };
}

/** 0..1 progress of an action at the given clock value. */
export function actionProgress(action: ActiveAction, clockTotalMs: number): number {
  const elapsed = clockTotalMs - action.startedAtMs;
  if (action.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsed / action.durationMs));
}

/** In-game ms still left in the action (never negative). */
export function actionRemainingMs(action: ActiveAction, clockTotalMs: number): number {
  return Math.max(0, action.startedAtMs + action.durationMs - clockTotalMs);
}

function isSleeping(action: ActiveAction | null): boolean {
  return action?.interactionId === 'sleep';
}

/**
 * The heart of the game loop. Advances the clock by `realMs` (scaled by the
 * active action speed), decays needs, applies action effects proportionally
 * and returns the events the UI/audio/tutorial layer should react to.
 */
export function advanceWorld<W extends SimWorld>(
  world: W,
  realMs: number,
): { world: W; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const stepMs = Math.min(Math.max(realMs, 0), MAX_STEP_REAL_MS);
  if (stepMs <= 0) return { world, events };

  const action = world.action;
  const speed = action?.speed ?? 1;
  const gameMsDelta = realMsToGameMs(world.clock, stepMs) * speed;
  const before = world.clock.totalMs;
  const after = before + gameMsDelta;
  const clock: GameClock = { ...world.clock, totalMs: after };

  const mods: NeedModifiers = { sleeping: isSleeping(action) };
  const gameHours = gameMsDelta / 3_600_000;
  const effectWindowMs = action
    ? Math.max(0, Math.min(after, action.startedAtMs + action.durationMs) - Math.max(before, action.startedAtMs))
    : 0;
  const effectShare = action && action.durationMs > 0 ? effectWindowMs / action.durationMs : 0;

  const needs: Needs = { ...world.needs };
  for (const key of NEED_KEYS) {
    let delta = decayRate(key, mods) * gameHours;
    if (action && effectShare > 0) {
      // Positive catalog effects reduce decay (they restore the need).
      delta -= (action.effects[key] ?? 0) * effectShare;
    }
    needs[key] = clampNeed(needs[key] - delta);
  }

  let nextAction: ActiveAction | null = action;
  if (action) {
    const endsAt = action.startedAtMs + action.durationMs;
    let wokeReason: WakeReason | undefined;
    if (after >= endsAt) {
      wokeReason = 'duration';
    } else if (isSleeping(action) && needs.energy >= SLEEP_WAKE_ENERGY) {
      wokeReason = 'energy';
    } else if (isSleeping(action) && needs.hunger <= SLEEP_WAKE_HUNGER) {
      wokeReason = 'hunger';
    }
    if (wokeReason) {
      nextAction = null;
      events.push({
        type: 'action-completed',
        itemId: action.itemId,
        interactionId: action.interactionId,
        wokeReason,
      });
    }
  }

  // Needs that just crossed into the critical zone (UI shows a shortcut).
  const criticalBefore = new Set(action ? criticalNeeds(world.needs) : []);
  for (const need of criticalNeeds(needs)) {
    if (!criticalBefore.has(need)) events.push({ type: 'need-critical', need });
  }

  const dayBefore = Math.floor(before / GAME_DAY_MS) + 1;
  const dayAfter = Math.floor(after / GAME_DAY_MS) + 1;
  if (dayAfter !== dayBefore) events.push({ type: 'day-changed', day: dayAfter });

  return { world: { ...world, clock, needs, action: nextAction }, events };
}

/**
 * Fast-forwards the rest of the current action (the "skip" button). Equivalent
 * to advancing the clock by the remaining game time at the action's speed.
 */
export function skipAction<W extends SimWorld>(world: W): { world: W; events: SimEvent[] } {
  if (!world.action) return { world, events: [] };
  const gameMsRemaining = actionRemainingMs(world.action, world.clock.totalMs);
  if (gameMsRemaining <= 0) return advanceWorld(world, 1);
  // Invert realMsToGameMs: gameMs = realMs / dayLengthMs * GAME_DAY_MS * speed
  const realMs =
    (gameMsRemaining * world.clock.dayLengthMs) / (GAME_DAY_MS * world.action.speed);
  return advanceWorld(world, Math.min(realMs, MAX_STEP_REAL_MS));
}

/**
 * Simulates the time the app was closed ("offline progress").
 *
 * The world keeps living, but with a cap: reopening after a week should not mean
 * a character starving to death on the sofa. The client calls this on boot; the
 * server will call the same function with its own cap.
 */
export const MAX_OFFLINE_REAL_MS = 8 * 60 * 60 * 1000;

export function simulateAway<W extends SimWorld>(
  world: W,
  awayRealMs: number,
): { world: W; events: SimEvent[] } {
  let current = world;
  // The cap is expressed in *game* time, so the world can age at most 8 in-game
  // hours no matter how long the app stayed closed.
  const capGameMs = 8 * 3_600_000;
  const awayGameMs = realMsToGameMs(world.clock, Math.max(awayRealMs, 0));
  const allowedRealMs =
    awayGameMs <= capGameMs
      ? Math.max(awayRealMs, 0)
      : (capGameMs * world.clock.dayLengthMs) / GAME_DAY_MS;
  let remaining = allowedRealMs;
  const events: SimEvent[] = [];
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP_REAL_MS);
    const result = advanceWorld(current, step);
    current = result.world;
    events.push(...result.events);
    remaining -= step;
  }
  return { world: current, events };
}
