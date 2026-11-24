import { isInsideLot, isPoolTile, tileKey, wallKey } from './constants';
import { adjacentTiles, findObject, isTileBlockedByObject } from './lot';
import type { Lot } from './types';

export interface Tile { x: number; z: number }

export function isWalkable(lot: Lot, x: number, z: number) {
  if (!isInsideLot(x, z) || isPoolTile(x, z)) return false;
  return !isTileBlockedByObject(lot, x, z);
}

export function edgeKeyBetween(a: Tile, b: Tile) {
  if (b.x === a.x + 1 && b.z === a.z) return wallKey('v', b.x, a.z);
  if (b.x === a.x - 1 && b.z === a.z) return wallKey('v', a.x, a.z);
  if (b.x === a.x && b.z === a.z + 1) return wallKey('h', a.x, b.z);
  if (b.x === a.x && b.z === a.z - 1) return wallKey('h', a.x, a.z);
  return null;
}

function canStep(lot: Lot, from: Tile, to: Tile) {
  if (!isWalkable(lot, to.x, to.z)) return false;
  const key = edgeKeyBetween(from, to);
  if (!key) return false;
  const wall = lot.walls[key];
  if (!wall || wall.kind === 'door') return true;
  return false;
}

interface Node extends Tile { g: number; f: number; parent?: Node }

function heuristic(a: Tile, b: Tile) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function reconstruct(node: Node): Tile[] {
  const path: Tile[] = [];
  let current: Node | undefined = node;
  while (current) {
    path.push({ x: current.x, z: current.z });
    current = current.parent;
  }
  return path.reverse();
}

export function findPath(lot: Lot, startFloat: Tile, goal: Tile, allowBlockedGoal = false): Tile[] | null {
  const start = { x: Math.round(startFloat.x), z: Math.round(startFloat.z) };
  const end = { x: Math.round(goal.x), z: Math.round(goal.z) };
  if (!isInsideLot(start.x, start.z) || !isInsideLot(end.x, end.z)) return null;
  if (!allowBlockedGoal && !isWalkable(lot, end.x, end.z)) return null;
  if (start.x === end.x && start.z === end.z) return [start];

  const open: Node[] = [{ ...start, g: 0, f: heuristic(start, end) }];
  const best = new Map<string, number>();
  const closed = new Set<string>();
  best.set(tileKey(start.x, start.z), 0);

  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let guard = 0;
  while (open.length && guard < 3000) {
    guard += 1;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const ck = tileKey(current.x, current.z);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (current.x === end.x && current.z === end.z) return reconstruct(current);
    for (const [dx, dz] of neighbors) {
      const next: Tile = { x: current.x + dx, z: current.z + dz };
      if (!isInsideLot(next.x, next.z)) continue;
      const nk = tileKey(next.x, next.z);
      if (closed.has(nk)) continue;
      if (next.x === end.x && next.z === end.z) {
        if (allowBlockedGoal || canStep(lot, current, next)) {
          const node: Node = { ...next, g: current.g + 1, f: current.g + 1, parent: current };
          return reconstruct(node);
        }
        continue;
      }
      if (!canStep(lot, current, next)) continue;
      const g = current.g + 1;
      if ((best.get(nk) ?? Infinity) <= g) continue;
      best.set(nk, g);
      open.push({ ...next, g, f: g + heuristic(next, end), parent: current });
    }
  }
  return null;
}

export function nearestWalkable(lot: Lot, x: number, z: number, maxRadius = 4): Tile | null {
  if (isWalkable(lot, x, z)) return { x, z };
  for (let r = 1; r <= maxRadius; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dz = -r; dz <= r; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const tx = x + dx;
        const tz = z + dz;
        if (isWalkable(lot, tx, tz)) return { x: tx, z: tz };
      }
    }
  }
  return null;
}

export function findBestStandTile(lot: Lot, from: Tile, objectId: string): { tile: Tile; path: Tile[] } | null {
  const object = findObject(lot, objectId);
  if (!object) return null;
  const candidates = adjacentTiles(lot, object);
  let best: { tile: Tile; path: Tile[] } | null = null;
  for (const candidate of candidates) {
    const path = findPath(lot, from, candidate);
    if (!path) continue;
    if (!best || path.length < best.path.length) best = { tile: candidate, path };
  }
  return best;
}

export function findSocialTile(lot: Lot, from: Tile, other: Tile): { tile: Tile; path: Tile[] } | null {
  const center = { x: Math.round(other.x), z: Math.round(other.z) };
  const candidates: Tile[] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      if (dx === 0 && dz === 0) continue;
      candidates.push({ x: center.x + dx, z: center.z + dz });
    }
  }
  let best: { tile: Tile; path: Tile[] } | null = null;
  for (const candidate of candidates) {
    const path = findPath(lot, from, candidate);
    if (!path) continue;
    if (!best || path.length < best.path.length) best = { tile: candidate, path };
  }
  return best;
}

export function findClosestObjectTile(lot: Lot, from: Tile, defIds: string[]): { objectId: string; tile: Tile; path: Tile[] } | null {
  let best: { objectId: string; tile: Tile; path: Tile[] } | null = null;
  for (const object of lot.objects) {
    if (!defIds.includes(object.defId)) continue;
    const result = findBestStandTile(lot, from, object.id);
    if (!result) continue;
    if (!best || result.path.length < best.path.length) best = { objectId: object.id, ...result };
  }
  return best;
}
