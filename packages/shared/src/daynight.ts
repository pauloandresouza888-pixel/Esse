/**
 * Day/night palette.
 *
 * The room art is fixed; only an "ambient tint" is applied on top of it, which
 * is what makes a 24-minute day feel alive without redrawing anything. Keeping
 * the keyframes here (and not inside Phaser) means the same palette can later
 * drive the server-side weather and the React HUD.
 */
import { clamp01, mixHex } from './math';

export interface DayKeyframe {
  /** Hour of the day, 0..24. */
  hour: number;
  /** Sky gradient. */
  skyTop: string;
  skyBottom: string;
  /** Color multiplied over the whole scene. */
  tint: string;
  /** Strength of the tint, 0..1. */
  tintAlpha: number;
}

export const DAY_KEYFRAMES: readonly DayKeyframe[] = [
  { hour: 0, skyTop: '#1B1E3C', skyBottom: '#3A3D63', tint: '#1B1E3C', tintAlpha: 0.58 },
  { hour: 5, skyTop: '#3E3A66', skyBottom: '#F09A7A', tint: '#5A4A78', tintAlpha: 0.42 },
  { hour: 7, skyTop: '#F8B195', skyBottom: '#FDE7C6', tint: '#FFD9B0', tintAlpha: 0.18 },
  { hour: 10, skyTop: '#8ECBF0', skyBottom: '#D9F1FB', tint: '#FFF6E4', tintAlpha: 0.08 },
  { hour: 14, skyTop: '#7DC3EC', skyBottom: '#E3F4FC', tint: '#FFFFFF', tintAlpha: 0.02 },
  { hour: 17, skyTop: '#F2A46B', skyBottom: '#FBE3C8', tint: '#FFC18E', tintAlpha: 0.22 },
  { hour: 19, skyTop: '#81578C', skyBottom: '#F29C80', tint: '#7A5A96', tintAlpha: 0.4 },
  { hour: 22, skyTop: '#262A4C', skyBottom: '#4A4770', tint: '#20253F', tintAlpha: 0.52 },
  { hour: 24, skyTop: '#1B1E3C', skyBottom: '#3A3D63', tint: '#1B1E3C', tintAlpha: 0.58 },
];

export interface Ambient {
  skyTop: string;
  skyBottom: string;
  tint: string;
  tintAlpha: number;
  /** True between 19:00 and 06:00, used to switch lamps/windows on. */
  isNight: boolean;
}

/** Interpolates the ambient palette for a fraction of day (0 = 00:00, 1 = 24:00). */
export function ambientForDayProgress(dayProgress: number): Ambient {
  const hour = clamp01(dayProgress) * 24;
  let before = DAY_KEYFRAMES[0] as DayKeyframe;
  let after = DAY_KEYFRAMES[DAY_KEYFRAMES.length - 1] as DayKeyframe;
  for (let i = 0; i < DAY_KEYFRAMES.length - 1; i += 1) {
    const current = DAY_KEYFRAMES[i] as DayKeyframe;
    const next = DAY_KEYFRAMES[i + 1] as DayKeyframe;
    if (hour >= current.hour && hour <= next.hour) {
      before = current;
      after = next;
      break;
    }
  }
  const span = after.hour - before.hour || 1;
  const t = clamp01((hour - before.hour) / span);
  return {
    skyTop: mixHex(before.skyTop, after.skyTop, t),
    skyBottom: mixHex(before.skyBottom, after.skyBottom, t),
    tint: mixHex(before.tint, after.tint, t),
    tintAlpha: before.tintAlpha + (after.tintAlpha - before.tintAlpha) * t,
    isNight: hour >= 19 || hour < 6,
  };
}
