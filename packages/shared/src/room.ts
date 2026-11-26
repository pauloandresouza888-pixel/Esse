/**
 * Room space.
 *
 * The apartment is also a small logical grid (22 x 16 cells, ~0.5 m each) used
 * for walking, collision and "walk to the fridge". Rendering converts cells to
 * design pixels; the simulation only ever sees cells. Keeping this in `shared`
 * means the future server can validate movement with the same rules the phone
 * uses, and the tests can walk the character around without Phaser.
 *
 * Row 0 is the **back** of the room (far wall), row 15 the front (near camera).
 */
import { ROOM_PLACEMENTS, type RoomPlacement } from './content';
import { findPath, type GridPoint, type Tile } from './grid';

/** Logical size of the room grid (cells). */
export const ROOM_CELLS = { cols: 22, rows: 16 } as const;

export interface CellRect {
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Footprint of a placement in cells. */
export function placementRect(placement: RoomPlacement): CellRect {
  return {
    x: placement.cell.x,
    y: placement.cell.y,
    w: placement.footprint.w,
    d: placement.footprint.d,
  };
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Builds the collision grid: 1 = blocked (outside, furniture), 0 = walkable.
 * Rugs and other `walkOver` pieces do not block.
 */
export function buildBlockedGrid(
  placements: readonly RoomPlacement[] = ROOM_PLACEMENTS,
  cols: number = ROOM_CELLS.cols,
  rows: number = ROOM_CELLS.rows,
): Tile[][] {
  const grid: Tile[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0 as Tile),
  );
  // Keep a one cell margin on the sides and the very front so the character
  // never clips into the wall or walks off-screen.
  for (let y = 0; y < rows; y += 1) {
    const row = grid[y] as Tile[];
    for (let x = 0; x < cols; x += 1) {
      if (x === 0 || x === cols - 1 || y >= rows - 1) row[x] = 1;
    }
  }
  for (const placement of placements) {
    if (placement.walkOver) continue;
    const rect = placementRect(placement);
    for (let dy = 0; dy < rect.d; dy += 1) {
      for (let dx = 0; dx < rect.w; dx += 1) {
        const x = rect.x + dx;
        const y = rect.y + dy;
        if (y < 0 || y >= rows || x < 0 || x >= cols) continue;
        (grid[y] as Tile[])[x] = 1;
      }
    }
  }
  return grid;
}

export function isBlocked(grid: Tile[][], x: number, y: number): boolean {
  return grid[y]?.[x] !== 0;
}

/** Nearest walkable cell to `point` (deterministic scan). */
export function nearestFreeCell(grid: Tile[][], point: GridPoint): GridPoint | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!isBlocked(grid, point.x, point.y)) return point;
  let best: GridPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (isBlocked(grid, x, y)) continue;
      const distance = Math.abs(x - point.x) + Math.abs(y - point.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }
  }
  return best;
}

/**
 * Walkable cell where the character stands to use an object: directly in front
 * of it (one row below the footprint), centered. Falls back to a neighbor.
 */
export function approachCell(grid: Tile[][], placement: RoomPlacement): GridPoint | null {
  const rect = placementRect(placement);
  const centerX = rect.x + Math.floor((rect.w - 1) / 2);
  const frontY = rect.y + rect.d;
  const candidates: GridPoint[] = [{ x: centerX, y: frontY }];
  for (let offset = 1; offset <= rect.w; offset += 1) {
    candidates.push({ x: centerX + offset, y: frontY }, { x: centerX - offset, y: frontY });
  }
  candidates.push({ x: centerX, y: rect.y - 1 });
  for (const candidate of candidates) {
    if (!isBlocked(grid, candidate.x, candidate.y)) return candidate;
  }
  return nearestFreeCell(grid, { x: centerX, y: frontY });
}

/**
 * Path between two cells, both snapped to walkable tiles. Returns the list of
 * cells to walk (including the start), or an empty list when unreachable.
 */
export function findRoomPath(grid: Tile[][], from: GridPoint, to: GridPoint): GridPoint[] {
  const start = nearestFreeCell(grid, from);
  const goal = nearestFreeCell(grid, to);
  if (!start || !goal) return [];
  return findPath(grid, start, goal);
}

/** Center cell of the room, used as the default spawn point. */
export const SPAWN_CELL: GridPoint = { x: 11, y: 6 };

/** Full grid + placements used by the phase 1 scene and its tests. */
export function defaultRoomGrid(): Tile[][] {
  return buildBlockedGrid();
}

/** Placement that houses a catalog item in the default house. */
export function placementForItemId(itemId: string): RoomPlacement | undefined {
  return ROOM_PLACEMENTS.find((placement) => placement.itemId === itemId);
}

/** True when a cell is the approach cell of some interactive object. */
export function isNearInteractive(grid: Tile[][], cell: GridPoint): boolean {
  for (const placement of ROOM_PLACEMENTS) {
    if (placement.interactive === false) continue;
    const approach = approachCell(grid, placement);
    if (!approach) continue;
    if (Math.abs(approach.x - cell.x) + Math.abs(approach.y - cell.y) <= 2) return true;
  }
  return false;
}
