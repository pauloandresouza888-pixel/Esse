/**
 * Store, inventory and building (Phase 2).
 *
 * Extra purchased furniture is saved separately from the hand-tuned default
 * layout as catalog ids + grid cells, then converted to renderer placements.
 *
 * Everything here is pure and Phaser-free: the store debits coins, the scene
 * renders, and the tests can buy/place/decline without a canvas.
 */
import {
  ITEMS,
  itemById,
  ROOM_ART_SIZES,
  ROOM_PLACEMENTS,
  type CatalogItem,
  type HouseItemPlacement,
  type RoomPlacement,
} from './content';
import { buildBlockedGrid, ROOM_CELLS } from './room';

/** Grid cell of a custom placement (top-left of the footprint). */
export const MAX_EXTRA_PLACEMENTS = 200;

export interface ExtraPlacement {
  /** Unique placement id ("extra-3"), never reused. */
  id: string;
  itemId: string;
  x: number;
  y: number;
}

export type PurchaseResult =
  | { ok: true; money: number; inventory: string[] }
  | { ok: false; reason: 'unknown-item' | 'not-enough-money' };

/**
 * Buys one unit of `itemId`: debits the price and pushes it into the inventory.
 * Returns the new money/inventory, or the reason it was refused - the caller
 * never has to guess why the button did nothing.
 */
export function buyItem(
  itemId: string,
  money: number,
  inventory: readonly string[],
): PurchaseResult {
  const item = itemById(itemId);
  if (!item) return { ok: false, reason: 'unknown-item' };
  if (money < item.price) return { ok: false, reason: 'not-enough-money' };
  return { ok: true, money: money - item.price, inventory: [...inventory, item.id] };
}

/** Removes one unit from the inventory (first occurrence). */
export function takeFromInventory(
  inventory: readonly string[],
  itemId: string,
): string[] | null {
  const index = inventory.indexOf(itemId);
  if (index < 0) return null;
  return [...inventory.slice(0, index), ...inventory.slice(index + 1)];
}

/**
 * Footprint of a catalog item on the floor grid.
 *
 * `size` is in "furniture cells" of the hand-made layout; the room grid is
 * finer, so a piece spans ~1.5 grid cells per catalog cell.
 */
export function footprintOf(item: CatalogItem): { w: number; d: number } {
  return {
    w: Math.max(1, Math.round(item.size.w * 1.5)),
    d: Math.max(1, Math.round(item.size.h * 1.5)),
  };
}

/** Builds the `RoomPlacement`-shaped object used by renderer/collision. */
export function placementFromExtra(extra: ExtraPlacement): RoomPlacement | null {
  const item = itemById(extra.itemId);
  if (!item) return null;
  const footprint = footprintOf(item);
  const art = ROOM_ART_SIZES[item.id] ?? { w: 96, h: 96 };
  return {
    id: extra.id,
    itemId: extra.itemId,
    cell: { x: extra.x, y: extra.y },
    footprint,
    art,
    scale: 0.7,
    layer: item.placement === 'wall' ? 'back' : 'floor',
    hit: { w: Math.max(48, art.w * 0.8), h: Math.max(48, art.h * 0.8) },
    labelKey: `items.${extra.itemId}`,
    walkOver: item.placement === 'wall',
  };
}

/** True when the footprint fits inside the room and touches no furniture. */
export function canPlace(
  extra: ExtraPlacement,
  extras: readonly ExtraPlacement[] = [],
): boolean {
  const placement = placementFromExtra(extra);
  if (!placement || extras.length >= MAX_EXTRA_PLACEMENTS) return false;
  const { x, y } = placement.cell;
  const { w, d } = placement.footprint;
  // One-cell margin on the sides and two cells at the front (camera edge).
  if (x < 1 || y < 1 || x + w > ROOM_CELLS.cols - 1 || y + d > ROOM_CELLS.rows - 2) return false;
  const others: RoomPlacement[] = [...ROOM_PLACEMENTS];
  for (const candidate of extras) {
    if (candidate.id === extra.id) continue;
    const built = placementFromExtra(candidate);
    if (built) others.push(built);
  }
  const grid = buildBlockedGrid(others);
  for (let dy = 0; dy < d; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      if (grid[y + dy]?.[x + dx] !== 0) return false;
    }
  }
  return true;
}

/**
 * First free spot (scan order) for an item, so "place" from the inventory is
 * one tap. Returns null when the room is full.
 */
export function findFreeSpot(
  itemId: string,
  extras: readonly ExtraPlacement[],
  nextIndex = extras.length + 1,
): ExtraPlacement | null {
  const probe: ExtraPlacement = { id: `extra-${nextIndex}`, itemId, x: 1, y: 1 };
  for (let y = 1; y <= ROOM_CELLS.rows - 2; y += 1) {
    for (let x = 1; x <= ROOM_CELLS.cols - 2; x += 1) {
      const candidate = { ...probe, x, y };
      if (canPlace(candidate, extras)) return candidate;
    }
  }
  return null;
}

/** Catalog items sold in the store (stable order). */
export const STORE_ITEMS: readonly CatalogItem[] = ITEMS;

/** Converts a saved `HouseItemPlacement` into a runtime `ExtraPlacement`. */
export function extraFromHouseItem(item: HouseItemPlacement): ExtraPlacement {
  return { id: item.id, itemId: item.itemId, x: item.x, y: item.y };
}
