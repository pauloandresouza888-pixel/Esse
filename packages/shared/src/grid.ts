/**
 * Tile grid helpers.
 *
 * The house is a simple 2D tile map (Phase 1) that will later also be used by
 * the isometric renderer: `1` = wall, `0`/`.` = floor. Everything here is pure
 * and cheap enough to run in the render loop.
 */
import { HOUSE_COLS, HOUSE_ROWS, type HouseModel, type HouseItemPlacement } from './content';

export type Tile = 0 | 1;

export interface GridPoint {
  x: number;
  y: number;
}

export function parseGrid(rows: readonly string[]): Tile[][] {
  return rows.map((row) =>
    Array.from(row).map((char): Tile => (char === '1' ? 1 : 0)),
  );
}

export function isInside(grid: Tile[][], x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

export function isWalkable(grid: Tile[][], x: number, y: number): boolean {
  return isInside(grid, x, y) && grid[y]?.[x] === 0;
}

/** Cells occupied by an item, honoring its rotation (w/h swap at 90/270). */
export function occupiedCells(
  placement: HouseItemPlacement,
  size: { w: number; h: number },
): GridPoint[] {
  const rotated = placement.rotation === 90 || placement.rotation === 270;
  const w = rotated ? size.h : size.w;
  const h = rotated ? size.w : size.h;
  const cells: GridPoint[] = [];
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      cells.push({ x: placement.x + dx, y: placement.y + dy });
    }
  }
  return cells;
}

export function itemAtCell(
  items: readonly HouseItemPlacement[],
  sizes: Record<string, { w: number; h: number }>,
  x: number,
  y: number,
): HouseItemPlacement | undefined {
  return items.find((placement) => {
    const size = sizes[placement.itemId];
    if (!size) return false;
    return occupiedCells(placement, size).some((cell) => cell.x === x && cell.y === y);
  });
}

/**
 * Breadth-first search on walkable tiles. Used for tap-to-move: the player taps
 * a point, we path there. When the target is blocked we walk to the nearest
 * reachable neighbor instead.
 */
export function findPath(
  grid: Tile[][],
  start: GridPoint,
  goal: GridPoint,
): GridPoint[] {
  if (!isWalkable(grid, start.x, start.y) || !isInside(grid, goal.x, goal.y)) return [];
  if (start.x === goal.x && start.y === goal.y) return [start];
  const queue: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint | null>([[key(start), null]]);
  const goalWalkable = isWalkable(grid, goal.x, goal.y);
  let end: GridPoint | null = null;
  while (queue.length > 0) {
    const current = queue.shift() as GridPoint;
    if (current.x === goal.x && current.y === goal.y && goalWalkable) {
      end = current;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!isWalkable(grid, next.x, next.y)) continue;
      if (cameFrom.has(key(next))) continue;
      cameFrom.set(key(next), current);
      queue.push(next);
    }
  }
  if (!end) {
    if (goalWalkable) return [];
    // Goal blocked (e.g. tapped a table): find the closest reachable tile.
    let best: GridPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const visitedKey of cameFrom.keys()) {
      const point = unkey(visitedKey);
      const distance = Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }
    end = best;
    if (!end) return [];
  }
  const path: GridPoint[] = [];
  let cursor: GridPoint | null = end;
  while (cursor) {
    path.unshift(cursor);
    cursor = cameFrom.get(key(cursor)) ?? null;
  }
  return path;
}

function key(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function unkey(value: string): GridPoint {
  const [x, y] = value.split(',');
  return { x: Number(x), y: Number(y) };
}

/** Convenience: dimensions of the *current* default house (used before load). */
export const DEFAULT_GRID_SIZE = { cols: HOUSE_COLS, rows: HOUSE_ROWS };

export function houseSize(house: HouseModel): { cols: number; rows: number } {
  const rows = house.grid.length;
  const cols = house.grid[0]?.length ?? 0;
  return { cols, rows };
}
