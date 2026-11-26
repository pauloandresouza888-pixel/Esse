import { describe, expect, it } from 'vitest';
import {
  advanceClock,
  ambientForDayProgress,
  createClock,
  createFriendCode,
  createNeeds,
  decayNeeds,
  DEFAULT_DAY_LENGTH_SECONDS,
  GAME_DAY_MS,
  realMsToGameMs,
  isCritical,
  isValidFriendCode,
  migrateSave,
  mostUrgentNeed,
  readClock,
  HOUSE_GRID,
  HOUSE_COLS,
  findPath,
  parseGrid,
  isWalkable,
} from '../index';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('clock', () => {
  it('starts on day 1 at 07:00 by default', () => {
    const clock = createClock();
    const reading = readClock(clock);
    expect(reading.day).toBe(1);
    expect(reading.hour).toBe(7);
    expect(reading.label).toBe('07:00');
  });

  it('advances exactly one day per configured day length', () => {
    const clock = createClock(DEFAULT_DAY_LENGTH_SECONDS, 0);
    const advanced = advanceClock(clock, DEFAULT_DAY_LENGTH_SECONDS * 1000);
    const reading = readClock(advanced);
    expect(reading.day).toBe(2);
    expect(reading.label).toBe('00:00');
  });

  it('maps one real second to one in-game minute by default', () => {
    const clock = createClock();
    expect(realMsToGameMs(clock, 1000)).toBeCloseTo(60_000, 5);
    const advanced = advanceClock(clock, 1000);
    expect(readClock(advanced).label).toBe('07:01');
  });

  it('stores the day length inside the clock so saves stay self contained', () => {
    const clock = createClock(12 * 60);
    expect(clock.dayLengthMs).toBe(12 * 60 * 1000);
    // One in-game day = GAME_DAY_MS regardless of real length.
    const advanced = advanceClock(clock, clock.dayLengthMs);
    expect(advanced.totalMs - clock.totalMs).toBe(GAME_DAY_MS);
  });

  it('reports day phases used for lighting', () => {
    const clock = { totalMs: DAY_MS * 0.5, speed: 1, dayLengthMs: DEFAULT_DAY_LENGTH_SECONDS * 1000 };
    expect(readClock(clock).phase).toBe('afternoon');
    expect(ambientForDayProgress(0.5).isNight).toBe(false);
    expect(ambientForDayProgress(0.95).isNight).toBe(true);
  });
});

describe('needs', () => {
  it('creates full needs with overrides clamped', () => {
    const needs = createNeeds({ hunger: 140, energy: 30 });
    expect(needs.hunger).toBe(100);
    expect(needs.energy).toBe(30);
  });

  it('decays needs over game hours', () => {
    const needs = createNeeds({ hunger: 80 });
    const after = decayNeeds(needs, 2);
    // hunger decays 10/h -> -20
    expect(after.hunger).toBeCloseTo(60, 5);
  });

  it('recovers energy while sleeping and decays hunger', () => {
    const needs = createNeeds({ energy: 40, hunger: 70 });
    const after = decayNeeds(needs, 8, { sleeping: true });
    expect(after.energy).toBeGreaterThan(40);
    expect(after.hunger).toBeLessThan(70);
  });

  it('never leaves the 0..100 range', () => {
    const needs = createNeeds({ hunger: 3, bladder: 1 });
    const after = decayNeeds(needs, 48);
    expect(after.hunger).toBe(0);
    expect(after.bladder).toBe(0);
    expect(isCritical(after, 'hunger')).toBe(true);
  });

  it('finds the lowest need and breaks ties by priority', () => {
    expect(mostUrgentNeed(createNeeds({ bladder: 10, hunger: 5 }))).toBe('hunger');
    // Same value: bladder comes first in NEED_PRIORITY.
    expect(mostUrgentNeed(createNeeds({ bladder: 10, hunger: 10 }))).toBe('bladder');
    expect(mostUrgentNeed(createNeeds())).toBeNull();
  });
});

describe('grid', () => {
  it('parses the default house grid', () => {
    const grid = parseGrid(HOUSE_GRID);
    expect(grid.length).toBe(16);
    expect(grid[0]?.length).toBe(HOUSE_COLS);
    expect(isWalkable(grid, 0, 0)).toBe(false);
    expect(isWalkable(grid, 5, 5)).toBe(true);
  });

  it('paths from one point to another and stops next to blocked goals', () => {
    const grid = parseGrid(HOUSE_GRID);
    const path = findPath(grid, { x: 2, y: 2 }, { x: 6, y: 6 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 2, y: 2 });
    expect(path[path.length - 1]).toEqual({ x: 6, y: 6 });

    const blocked = findPath(grid, { x: 2, y: 2 }, { x: 0, y: 0 });
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[blocked.length - 1]).not.toEqual({ x: 0, y: 0 });
  });
});

describe('save migration', () => {
  it('rejects garbage and future versions', () => {
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave({ version: 99 })).toBeNull();
    expect(migrateSave({ version: 1 })).toBeNull();
  });
});

describe('friend codes', () => {
  it('generates valid 8 character codes', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = createFriendCode();
      expect(code).toHaveLength(8);
      expect(isValidFriendCode(code)).toBe(true);
    }
    expect(isValidFriendCode('ABC')).toBe(false);
  });
});
