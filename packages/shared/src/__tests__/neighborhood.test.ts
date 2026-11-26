import { describe, expect, it } from 'vitest';
import {
  applyRelationshipAction,
  NEIGHBORHOOD_LOCATIONS,
  NEIGHBORHOOD_NPCS,
  npcLocationAtHour,
  npcsAtLocation,
} from '../index';

describe('neighborhood routines', () => {
  it('provides three public places and five locals', () => {
    expect(NEIGHBORHOOD_LOCATIONS).toHaveLength(3);
    expect(NEIGHBORHOOD_NPCS).toHaveLength(5);
  });

  it('assigns deterministic daily routines, including boundaries and midnight', () => {
    expect(npcLocationAtHour('mia', 8)).toBe('plaza');
    expect(npcLocationAtHour('mia', 12)).toBe('cafe');
    expect(npcLocationAtHour('mia', 23)).toBeNull();
    expect(npcLocationAtHour('mia', 32)).toBe('plaza');
    expect(npcLocationAtHour('unknown', 12)).toBeNull();
  });

  it('returns only locals currently present at a place', () => {
    const atCafe = npcsAtLocation(12, 'cafe');
    expect(atCafe.some((npc) => npc.id === 'mia')).toBe(true);
    expect(atCafe.every((npc) => npcLocationAtHour(npc.id, 12) === 'cafe')).toBe(true);
  });
});

describe('local relationships', () => {
  it('grows friendship through conversation and romance through flirting', () => {
    const first = applyRelationshipAction(undefined, 'talk');
    expect(first).toEqual({ friendship: 8, romance: 0, interactions: 1 });
    expect(applyRelationshipAction(first, 'flirt')).toEqual({ friendship: 11, romance: 6, interactions: 2 });
  });

  it('caps scores at 100 without mutating the previous relationship', () => {
    const start = { friendship: 98, romance: 99, interactions: 20 };
    expect(applyRelationshipAction(start, 'flirt')).toEqual({ friendship: 100, romance: 100, interactions: 21 });
    expect(start).toEqual({ friendship: 98, romance: 99, interactions: 20 });
  });
});
