/**
 * Game clock.
 *
 * Important design decision: time is expressed in *in-game milliseconds* and
 * advanced from a real-milliseconds budget. The same rules therefore produce the
 * same result on a 30 FPS phone, a 144 FPS desktop and a future authoritative
 * server that simply steps the clock in a loop.
 *
 * Default tuning: one in-game day lasts 24 real minutes, so 1 real second = 1
 * in-game minute. Each save stores its own `dayLengthMs`, which is what makes
 * "day length" a configurable setting later on.
 */

/** In-game milliseconds in a full day. */
export const GAME_DAY_MS = 24 * 60 * 60 * 1000;

/** Default: one full in-game day lasts 24 real minutes (1440 s). */
export const DEFAULT_DAY_LENGTH_SECONDS = 24 * 60;

/** Simulation step used by the client loop (and later by the server). */
export const DEFAULT_TICK_MS = 250 as const;

export type DayPhase = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface GameClock {
  /** In-game milliseconds elapsed since day 1, 00:00. */
  totalMs: number;
  /** Time scale multiplier coming from settings (1 = normal). */
  speed: number;
  /** Real milliseconds that one in-game day should take. */
  dayLengthMs: number;
}

export function createClock(
  dayLengthSeconds: number = DEFAULT_DAY_LENGTH_SECONDS,
  startHour = 7,
  startMinute = 0,
): GameClock {
  const startMs = (startHour * 60 + startMinute) * 60_000;
  return { totalMs: startMs, speed: 1, dayLengthMs: dayLengthSeconds * 1000 };
}

/**
 * Converts real elapsed milliseconds into in-game milliseconds.
 * With the default 24-minute day, 1 real second -> 1 game minute.
 */
export function realMsToGameMs(clock: GameClock, realMs: number): number {
  return (realMs / clock.dayLengthMs) * GAME_DAY_MS;
}

/**
 * Advances the clock by real elapsed milliseconds. Pure function: returns a new
 * clock, so tests and the server can call it without side effects.
 */
export function advanceClock(clock: GameClock, realMs: number): GameClock {
  if (realMs <= 0) return clock;
  return {
    ...clock,
    totalMs: clock.totalMs + realMsToGameMs(clock, realMs) * clock.speed,
  };
}

export interface ClockReading {
  day: number;
  hour: number;
  minute: number;
  /** 0..1 progress inside the current 24h cycle (useful for sky colors). */
  dayProgress: number;
  phase: DayPhase;
  /** "07:42" style label (24h). */
  label: string;
}

export function readClock(clock: GameClock): ClockReading {
  const total = Math.max(0, clock.totalMs);
  const day = Math.floor(total / GAME_DAY_MS) + 1;
  const within = total % GAME_DAY_MS;
  const hour = Math.floor(within / 3_600_000);
  const minute = Math.floor((within % 3_600_000) / 60_000);
  const dayProgress = within / GAME_DAY_MS;
  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { day, hour, minute, dayProgress, phase: phaseForHour(hour), label };
}

export function phaseForHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Creates a clock reading directly from a save's clock. */
export function readSaveClock(clock: GameClock): ClockReading {
  return readClock(clock);
}

export function formatDayLabel(day: number): string {
  return `D${day}`;
}

/** i18n key for the current phase, used by the HUD. */
export function phaseLabelKey(phase: DayPhase): string {
  return `clock.${phase}`;
}
