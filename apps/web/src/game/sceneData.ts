/**
 * Data contracts passed from React into the Phaser scene.
 *
 * This module deliberately imports **no Phaser code**: the React HUD, the tests
 * and the loading screen can all use these types and the factory below without
 * pulling the ~1 MB engine into their bundles.
 */
import type { Appearance, ExtraPlacement, InteractionId, QualityLevel, Settings } from '@vida/shared';

export interface RoomSceneData {
  appearance: Appearance;
  quality: QualityLevel;
  reducedMotion: boolean;
  /** In-game milliseconds already played (from the save). */
  clockTotalMs: number;
  /** Real milliseconds one in-game day takes. */
  dayLengthMs: number;
  /** Where the character stands when the scene boots (grid cell). */
  characterCell: { x: number; y: number };
  /** Extra furniture bought and placed by the player. */
  placedFurniture?: ExtraPlacement[];
}

/** Builds the scene payload from the save, applying quality defaults. */
export function roomSceneData(
  appearance: Appearance,
  quality: QualityLevel,
  settings: Pick<Settings, 'reducedMotion'>,
  clockTotalMs: number,
  dayLengthMs: number,
  characterCell: { x: number; y: number } = { x: 11, y: 7 },
  placedFurniture: ExtraPlacement[] = [],
): RoomSceneData {
  return {
    appearance,
    quality,
    reducedMotion: settings.reducedMotion,
    clockTotalMs,
    dayLengthMs,
    characterCell,
    placedFurniture,
  };
}

/** Full clock reading exposed to the HUD (no Phaser types involved). */
export interface ClockSnapshot {
  hour: number;
  minute: number;
  day: number;
  phase: string;
  label: string;
  dayProgress: number;
}

/** Payload of a tap on an object. */
export interface ObjectTapPayload {
  id: string;
  itemId: string;
  labelKey: string;
  cell: { x: number; y: number };
}

/** Payload of a tap on the floor. */
export interface FloorTapPayload {
  cell: { x: number; y: number };
}

/** Commands React sends into the scene (the scene never reads the save). */
export type SceneCommand =
  | { type: 'walk-to'; cell: { x: number; y: number } }
  | { type: 'face-object'; cell: { x: number; y: number } }
  | { type: 'play-action'; itemId: string; interactionId: InteractionId }
  | { type: 'stop-action' }
  | { type: 'set-paused'; paused: boolean }
  | { type: 'set-needs'; energy: number; hunger: number };
