/**
 * Seven needs, 0..100. They decay linearly with game time; a few modifiers
 * (sleeping, working, being away from home) change the decay rate.
 *
 * All numbers here are "game milliseconds per point" so they are independent
 * of the real clock speed. At the default 24 real minutes per game day:
 *   hunger 100 -> 0 in ~10 game hours, energy in ~14 hours, etc.
 */

export const NEED_KEYS = [
  'hunger',
  'energy',
  'hygiene',
  'bladder',
  'fun',
  'social',
  'mood',
] as const;

export type NeedKey = (typeof NEED_KEYS)[number];

export type Needs = Record<NeedKey, number>;

/** Points lost per in-game hour when the character is idle and awake. */
export const NEED_DECAY_PER_GAME_HOUR: Record<NeedKey, number> = {
  hunger: 10,
  energy: 7,
  hygiene: 4,
  bladder: 12,
  fun: 6,
  social: 5,
  // Mood is not a real "need" in Sims terms: it drifts towards the average of
  // the other six and is heavily influenced by recent memories. Keep a slow leak.
  mood: 1.5,
};

/** Points per in-game hour, expressed directly (used by decayNeeds). */
export const NEED_CRITICAL_THRESHOLD = 20;

/** Needs are ordered by urgency: used for HUD sorting and AI weighting. */
export const NEED_PRIORITY: readonly NeedKey[] = [
  'bladder',
  'hunger',
  'energy',
  'hygiene',
  'social',
  'fun',
  'mood',
];

export interface NeedModifiers {
  /** Character is asleep: energy recovers instead of decaying. */
  sleeping?: boolean;
  /** Character is at work: some needs freeze/recover. */
  working?: boolean;
  /** Character is visiting another house. */
  visiting?: boolean;
}

export const FULL_NEEDS: Readonly<Needs> = Object.freeze({
  hunger: 100,
  energy: 100,
  hygiene: 100,
  bladder: 100,
  fun: 100,
  social: 100,
  mood: 80,
});

export function clampNeed(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function createNeeds(overrides: Partial<Needs> = {}): Needs {
  const base: Needs = { ...FULL_NEEDS };
  for (const key of NEED_KEYS) {
    const override = overrides[key];
    if (typeof override === 'number') base[key] = clampNeed(override);
  }
  return base;
}

/** Decay rate (points per game hour) for a need under the current modifiers. */
export function decayRate(key: NeedKey, mods: NeedModifiers = {}): number {
  const base = NEED_DECAY_PER_GAME_HOUR[key];
  if (mods.sleeping) {
    switch (key) {
      case 'energy':
        return -14; // recovering while sleeping
      case 'hygiene':
        return base * 0.25;
      case 'bladder':
        return base * 0.5;
      case 'fun':
        return base * 0.4;
      case 'social':
        return base * 0.3;
      case 'mood':
        return -2; // rest improves mood slowly
      default:
        return base;
    }
  }
  if (mods.working) {
    switch (key) {
      case 'fun':
        return base * 0.5;
      case 'social':
        return base * 0.6;
      case 'energy':
        return base * 1.4;
      default:
        return base;
    }
  }
  if (mods.visiting) {
    switch (key) {
      case 'social':
        return -3; // being with friends helps
      case 'fun':
        return -1;
      default:
        return base;
    }
  }
  return base;
}

/**
 * Applies `gameHours` of decay. Positive rates reduce, negative rates restore.
 * Pure function, safe to call every tick.
 */
export function decayNeeds(
  needs: Needs,
  gameHours: number,
  mods: NeedModifiers = {},
): Needs {
  if (gameHours <= 0) return { ...needs };
  const next: Needs = { ...needs };
  for (const key of NEED_KEYS) {
    const delta = decayRate(key, mods) * gameHours;
    next[key] = clampNeed(next[key] - delta);
  }
  return next;
}

/** Directly changes a need (used by objects, interactions, memories). */
export function changeNeed(needs: Needs, key: NeedKey, amount: number): Needs {
  return { ...needs, [key]: clampNeed(needs[key] + amount) };
}

export function changeNeeds(needs: Needs, amounts: Partial<Needs>): Needs {
  const next: Needs = { ...needs };
  for (const key of NEED_KEYS) {
    const amount = amounts[key];
    if (typeof amount === 'number') next[key] = clampNeed(next[key] + amount);
  }
  return next;
}

export function isCritical(needs: Needs, key: NeedKey): boolean {
  return needs[key] < NEED_CRITICAL_THRESHOLD;
}

export function criticalNeeds(needs: Needs): NeedKey[] {
  return NEED_PRIORITY.filter((key) => isCritical(needs, key));
}

/**
 * Most urgent need: the lowest value, ties broken by NEED_PRIORITY. Returns
 * null when everything is above the critical threshold.
 */
export function mostUrgentNeed(needs: Needs): NeedKey | null {
  let worst: NeedKey | null = null;
  let worstValue = NEED_CRITICAL_THRESHOLD;
  for (const key of NEED_PRIORITY) {
    if (needs[key] < worstValue) {
      worstValue = needs[key];
      worst = key;
    }
  }
  return worst;
}

/** 0..1 overall wellbeing, used for the "mood" summary label. */
export function wellbeing(needs: Needs): number {
  const total = NEED_KEYS.reduce((sum, key) => sum + needs[key], 0);
  return total / (NEED_KEYS.length * 100);
}
