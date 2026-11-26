/**
 * Scene geometry + projection for the Phase 1 room.
 *
 * Why this file exists: the same numbers must place the furniture in Phaser, in
 * collision (`shared/room.ts`) and in the off-line preview PNGs used to review
 * art. They live here as plain functions (no Phaser import) so scripts can use
 * them too; `RoomScene` only turns the results into game objects.
 *
 * Coordinate system: the design canvas is 400 x 720 (portrait). The floor plan
 * is the lower part of it, projected like a "tall top-down" view: the back row
 * of cells hugs the wall, the front row sits near the camera.
 */
import { ROOM_CELLS } from '@vida/shared';

export const DESIGN_WIDTH = 400;
export const DESIGN_HEIGHT = 720;

/** Where the wall ends and the floor starts (design px). */
export const WALL_BOTTOM = 206;

/** Floor plan projection. */
export const PLAN = {
  /** Horizontal margin of the walkable floor. */
  left: 8,
  /** Width of one grid cell in design px. */
  cellW: (DESIGN_WIDTH - 16) / ROOM_CELLS.cols,
} as const;

/** Y of the top edge of the floor (row 0) and of the bottom (row 16). */
export const FLOOR_TOP = WALL_BOTTOM + 8;
export const FLOOR_BOTTOM = DESIGN_HEIGHT + 24;

/**
 * Vertical projection of the grid rows. Rows near the wall are compressed (a
 * "tall top-down" view, like the floor plans of life sims); rows near the
 * camera are taller.
 */
export const ROW_DEPTH_PX = 520;
export const ROW_CURVE = 0.78;

export interface ProjectedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
}

/** Screen Y of the top edge of a given row. */
export function rowY(row: number): number {
  const clamped = Math.max(0, Math.min(ROOM_CELLS.rows, row));
  const t = clamped / ROOM_CELLS.rows;
  return FLOOR_TOP + Math.pow(t, ROW_CURVE) * ROW_DEPTH_PX;
}

/** Screen Y of the bottom edge of a row (used for depth sorting). */
export function rowBottomY(row: number): number {
  return rowY(row + 1);
}

/** Projects a footprint (cells) to a screen rectangle. */
export function projectRect(
  cell: { x: number; y: number },
  footprint: { w: number; d: number },
): ProjectedRect {
  const left = PLAN.left + cell.x * PLAN.cellW;
  const width = footprint.w * PLAN.cellW;
  const top = rowY(cell.y);
  const bottom = rowY(cell.y + footprint.d);
  return {
    left,
    right: left + width,
    top,
    bottom,
    width,
    height: bottom - top,
    centerX: left + width / 2,
  };
}

/** Converts design px back to a cell (floor taps). */
export function screenToCell(x: number, y: number): { x: number; y: number } {
  const cellX = Math.round((x - PLAN.left) / PLAN.cellW - 0.5);
  // Binary search on rows because rowY is not linear.
  let low = 0;
  let high: number = ROOM_CELLS.rows;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (rowY(mid) < y) low = mid + 1;
    else high = mid;
  }
  return {
    x: Math.min(ROOM_CELLS.cols - 1, Math.max(0, cellX)),
    y: Math.min(ROOM_CELLS.rows - 1, Math.max(0, low - 1)),
  };
}

/** Center of a cell in design px (character feet position). */
export function cellToScreen(cell: { x: number; y: number }): { x: number; y: number } {
  return {
    x: PLAN.left + (cell.x + 0.5) * PLAN.cellW,
    y: rowBottomY(cell.y),
  };
}

/** Design width the character sprite is rendered at. */
export const CHARACTER_DESIGN_WIDTH = 92;

/** Layer hint to depth: everything is sorted by its bottom Y. */
export function depthFor(bottomY: number, layer?: 'back' | 'floor' | 'front'): number {
  // A tiny bias keeps rugs under furniture even when the bottoms coincide.
  const bias = layer === 'back' ? -0.2 : layer === 'front' ? 0.2 : 0;
  return bottomY + bias;
}
