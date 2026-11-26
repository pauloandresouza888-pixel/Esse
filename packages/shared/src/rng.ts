/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * Why: the ambient simulation (cat, TV, footsteps, NPC chatter) needs variety
 * but must be reproducible. A seeded RNG keeps tests deterministic and will let
 * the server and the client derive the same "random" ambience later.
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash for string->seed conversions (names, ids). */
export function hashString(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  if (list.length === 0) throw new Error('pick() called with an empty list');
  return list[Math.floor(rng() * list.length)] as T;
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
