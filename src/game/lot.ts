import {
  DRIVEWAY, FLOOR_STYLES, HOUSE, LOT_D, LOT_W, POOL, SEASON_META, WALL_STYLES,
  clamp, deepCopy, isInsideLot, isPoolTile, seasonFromDay, tileKey, uid, wallKey,
} from './constants';
import { getDef, rotatedFootprint, CAREERS, ASPIRATIONS } from './data';
import type {
  Appearance, FurnitureObject, GameState, Lot, Room, Sim, Wall, WallAxis, WallKind, WallStyleId, FloorStyleId,
} from './types';

export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#e8b995',
  hair: '#4a3025',
  hairStyle: 'wavy',
  eyes: '#5b7d9a',
  top: '#3f5963',
  bottom: '#2f3b44',
  shoes: '#e9e3d8',
  height: 1,
  build: 1,
  freckles: false,
  glasses: false,
};

export function cloneAppearance(a: Partial<Appearance> = {}): Appearance {
  return { ...DEFAULT_APPEARANCE, ...a };
}

export function objectBounds(o: FurnitureObject) {
  const def = getDef(o.defId);
  const [w, d] = rotatedFootprint(def, o.rotation);
  return { x: o.x, z: o.z, w, d };
}

export function objectTiles(o: FurnitureObject) {
  const b = objectBounds(o);
  const tiles: { x: number; z: number }[] = [];
  for (let dx = 0; dx < b.w; dx += 1) {
    for (let dz = 0; dz < b.d; dz += 1) tiles.push({ x: b.x + dx, z: b.z + dz });
  }
  return tiles;
}

export function blocksPlacement(defId: string) {
  const def = getDef(defId);
  if (def.blocks === false) return false;
  if (def.layer === 'floor' || def.layer === 'wall' || def.layer === 'surface') return false;
  return true;
}

export function isTileBlockedByObject(lot: Lot, x: number, z: number, ignoreId?: string) {
  return lot.objects.some((o) => {
    if (o.id === ignoreId || !blocksPlacement(o.defId)) return false;
    const b = objectBounds(o);
    return x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d;
  });
}

export function getFloorStyle(lot: Lot, x: number, z: number): FloorStyleId {
  return lot.floors[tileKey(x, z)] ?? 'grass';
}

export function canPlaceObject(
  lot: Lot, defId: string, x: number, z: number, rotation: number, ignoreId?: string,
): { ok: boolean; reason?: string } {
  const def = getDef(defId);
  const [w, d] = rotatedFootprint(def, rotation);
  if (x < 0 || z < 0 || x + w > lot.width || z + d > lot.depth) {
    return { ok: false, reason: 'Fora do terreno' };
  }
  let hasSurface = false;
  for (let dx = 0; dx < w; dx += 1) {
    for (let dz = 0; dz < d; dz += 1) {
      const tx = x + dx;
      const tz = z + dz;
      if (isPoolTile(tx, tz)) return { ok: false, reason: 'Área da piscina' };
      for (const other of lot.objects) {
        if (other.id === ignoreId) continue;
        const ob = objectBounds(other);
        if (tx < ob.x || tx >= ob.x + ob.w || tz < ob.z || tz >= ob.z + ob.d) continue;
        const otherDef = getDef(other.defId);
        const selfSurface = def.layer === 'surface';
        const otherSurface = otherDef.layer === 'surface' || otherDef.surface === true;
        if (otherSurface) hasSurface = true;
        if (blocksPlacement(defId) && blocksPlacement(other.defId)) return { ok: false, reason: 'Espaço ocupado' };
        if (selfSurface && blocksPlacement(other.defId) && !otherSurface) return { ok: false, reason: 'Precisa de uma superfície' };
        if (!selfSurface && def.surface !== true && otherDef.layer === 'surface' && blocksPlacement(other.defId)) {
          return { ok: false, reason: 'Espaço ocupado' };
        }
      }
    }
  }
  if (def.layer === 'surface' && !hasSurface) return { ok: false, reason: 'Precisa apoiar sobre uma mesa ou bancada' };
  return { ok: true };
}

export function findObject(lot: Lot, id: string | null | undefined) {
  if (!id) return undefined;
  return lot.objects.find((o) => o.id === id);
}

export function objectCenterTile(o: FurnitureObject) {
  const b = objectBounds(o);
  return { x: b.x + b.w / 2 - 0.5, z: b.z + b.d / 2 - 0.5 };
}

export function adjacentTiles(lot: Lot, o: FurnitureObject) {
  const b = objectBounds(o);
  const tiles: { x: number; z: number }[] = [];
  for (let x = b.x - 1; x <= b.x + b.w; x += 1) {
    for (let z = b.z - 1; z <= b.z + b.d; z += 1) {
      const inside = x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.d;
      if (inside) continue;
      if (!isInsideLot(x, z) || isPoolTile(x, z)) continue;
      if (isTileBlockedByObject(lot, x, z)) continue;
      tiles.push({ x, z });
    }
  }
  return tiles;
}

function makeWall(axis: WallAxis, x: number, z: number, kind: WallKind = 'wall', style: WallStyleId = 'stucco'): Wall {
  const key = wallKey(axis, x, z);
  return { id: `wall-${key}`, key, x, z, axis, kind, style };
}

function addWall(walls: Record<string, Wall>, axis: WallAxis, x: number, z: number, kind: WallKind = 'wall', style: WallStyleId = 'stucco') {
  const wall = makeWall(axis, x, z, kind, style);
  walls[wall.key] = wall;
}

function addObject(objects: FurnitureObject[], defId: string, x: number, z: number, rotation: 0 | 1 | 2 | 3 = 0, color?: string) {
  objects.push({ id: uid('obj'), defId, x, z, rotation, color, variant: Math.floor(Math.random() * 4) });
}

export function createInitialLot(): Lot {
  const floors: Record<string, FloorStyleId> = {};
  const walls: Record<string, Wall> = {};
  const objects: FurnitureObject[] = [];

  const paintRect = (x0: number, z0: number, w: number, d: number, style: FloorStyleId) => {
    for (let x = x0; x < x0 + w; x += 1) {
      for (let z = z0; z < z0 + d; z += 1) {
        if (isInsideLot(x, z)) floors[tileKey(x, z)] = style;
      }
    }
  };

  // Pisos internos e externos.
  paintRect(HOUSE.x0, HOUSE.z0, HOUSE.w, HOUSE.d, 'wood');
  paintRect(11, 4, 7, 7, 'tile');
  paintRect(4, 11, 7, 6, 'carpet');
  paintRect(11, 11, 3, 6, 'marble');
  paintRect(14, 11, 4, 6, 'wood');
  paintRect(18, 8, 4, 9, 'deck');
  paintRect(DRIVEWAY.x0, DRIVEWAY.z0, DRIVEWAY.w, DRIVEWAY.d, 'concrete');
  paintRect(9, 17, 1, 5, 'concrete');
  paintRect(POOL.x0 - 1, POOL.z0 - 1, POOL.w + 2, POOL.d + 2, 'stone');
  paintRect(POOL.x0, POOL.z0, POOL.w, POOL.d, 'water');

  // Fachada e paredes externas.
  for (let x = HOUSE.x0; x < HOUSE.x0 + HOUSE.w; x += 1) {
    addWall(walls, 'h', x, HOUSE.z0, 'wall', 'stucco');
    addWall(walls, 'h', x, HOUSE.z0 + HOUSE.d, 'wall', x % 4 === 0 ? 'accent' : 'stucco');
  }
  for (let z = HOUSE.z0; z < HOUSE.z0 + HOUSE.d; z += 1) {
    addWall(walls, 'v', HOUSE.x0, z, 'wall', 'stucco');
    addWall(walls, 'v', HOUSE.x0 + HOUSE.w, z, 'wall', z % 5 === 0 ? 'wood' : 'stucco');
  }

  // Portas e janelas.
  const openings: Array<[WallAxis, number, number, WallKind, WallStyleId]> = [
    ['h', 9, 17, 'door', 'stucco'], ['h', 12, 4, 'door', 'stucco'],
    ['h', 6, 4, 'window', 'stucco'], ['h', 7, 4, 'window', 'stucco'], ['h', 14, 4, 'window', 'stucco'],
    ['h', 5, 17, 'window', 'accent'], ['h', 10, 17, 'window', 'stucco'], ['h', 15, 17, 'window', 'accent'],
    ['v', 4, 7, 'window', 'stucco'], ['v', 4, 8, 'window', 'stucco'],
    ['v', 18, 10, 'window', 'wood'], ['v', 18, 11, 'window', 'wood'],
  ];
  openings.forEach(([axis, x, z, kind, style]) => addWall(walls, axis, x, z, kind, style));

  // Divisórias internas com portas.
  for (let z = 4; z <= 10; z += 1) addWall(walls, 'v', 11, z, z === 8 ? 'door' : 'wall', 'stucco');
  for (let x = 4; x <= 17; x += 1) addWall(walls, 'h', x, 11, x === 8 || x === 14 ? 'door' : 'wall', 'stucco');
  for (let z = 11; z <= 16; z += 1) addWall(walls, 'v', 11, z, z === 13 ? 'door' : 'wall', 'stucco');
  for (let z = 11; z <= 16; z += 1) addWall(walls, 'v', 14, z, z === 13 ? 'door' : 'wall', 'accent');

  // Sala de estar.
  addObject(objects, 'sofa', 5, 5, 0, '#d8b08d');
  addObject(objects, 'coffeeTable', 5, 7, 0, '#a97345');
  addObject(objects, 'rug', 4, 6, 0, '#c8b39a');
  addObject(objects, 'tv', 5, 4, 0);
  addObject(objects, 'bookshelf', 9, 4, 0, '#8b6245');
  addObject(objects, 'stereo', 4, 4, 0);
  addObject(objects, 'armchair', 8, 7, 0, '#6f8494');
  addObject(objects, 'fireplace', 5, 9, 0);
  addObject(objects, 'floorLamp', 9, 9, 0);
  addObject(objects, 'plant', 4, 9, 0);
  addObject(objects, 'painting', 8, 4, 0, '#c8796b');

  // Cozinha e jantar.
  addObject(objects, 'fridge', 11, 4, 0);
  addObject(objects, 'counter', 12, 4, 0, '#e6e3dc');
  addObject(objects, 'counter', 13, 4, 0, '#e6e3dc');
  addObject(objects, 'counter', 14, 4, 0, '#e6e3dc');
  addObject(objects, 'stove', 15, 4, 0);
  addObject(objects, 'sink', 16, 4, 0);
  addObject(objects, 'dishwasher', 17, 4, 0);
  addObject(objects, 'kitchenIsland', 13, 6, 0, '#e6e3dc');
  addObject(objects, 'diningTable', 15, 7, 0, '#a97345');
  addObject(objects, 'diningChair', 14, 7, 0, '#c8c2b6');
  addObject(objects, 'diningChair', 17, 7, 0, '#c8c2b6');
  addObject(objects, 'diningChair', 15, 9, 0, '#c8c2b6');
  addObject(objects, 'diningChair', 16, 9, 0, '#c8c2b6');
  addObject(objects, 'microwave', 14, 4, 0);
  addObject(objects, 'plant', 11, 9, 0);
  addObject(objects, 'painting', 12, 9, 0, '#8aa39a');

  // Quarto.
  addObject(objects, 'bedDouble', 5, 12, 0, '#e5ddd0');
  addObject(objects, 'nightstand', 7, 12, 0, '#a97345');
  addObject(objects, 'wardrobe', 4, 15, 0, '#d2a66f');
  addObject(objects, 'mirror', 9, 12, 0);
  addObject(objects, 'rug', 5, 14, 0, '#c8b39a');
  addObject(objects, 'plant', 9, 15, 0);
  addObject(objects, 'floorLamp', 4, 11, 0);

  // Banheiro.
  addObject(objects, 'toilet', 11, 12, 0);
  addObject(objects, 'shower', 13, 12, 0);
  addObject(objects, 'sinkBasin', 12, 11, 0);
  addObject(objects, 'bathtub', 11, 15, 0);

  // Escritório.
  addObject(objects, 'desk', 15, 11, 0, '#a97345');
  addObject(objects, 'officeChair', 15, 12, 0, '#3c4650');
  addObject(objects, 'computer', 16, 11, 0);
  addObject(objects, 'treadmill', 17, 14, 0);
  addObject(objects, 'guitar', 16, 13, 0);
  addObject(objects, 'easel', 14, 15, 0);
  addObject(objects, 'bookshelf', 16, 15, 0, '#8b6245');
  addObject(objects, 'floorLamp', 14, 16, 0);

  // Área externa.
  addObject(objects, 'lounger', 2, 16, 0, '#e5ddd0');
  addObject(objects, 'lounger', 5, 16, 0, '#e5ddd0');
  addObject(objects, 'umbrella', 3, 16, 0, '#e8dcc5');
  addObject(objects, 'grill', 19, 9, 0);
  addObject(objects, 'bench', 19, 13, 0, '#a97345');
  addObject(objects, 'flowerBed', 18, 18, 0, '#c8796b');
  addObject(objects, 'bike', 19, 19, 0);
  addObject(objects, 'flowerBed', 2, 13, 0, '#b8847b');

  const rooms: Room[] = [
    { id: uid('room'), name: 'Sala de estar', x: 4, z: 4, w: 7, d: 7, floor: 'wood' },
    { id: uid('room'), name: 'Cozinha & jantar', x: 11, z: 4, w: 7, d: 7, floor: 'tile' },
    { id: uid('room'), name: 'Quarto principal', x: 4, z: 11, w: 7, d: 6, floor: 'carpet' },
    { id: uid('room'), name: 'Banheiro', x: 11, z: 11, w: 3, d: 6, floor: 'marble' },
    { id: uid('room'), name: 'Escritório', x: 14, z: 11, w: 4, d: 6, floor: 'wood' },
    { id: uid('room'), name: 'Varanda & piscina', x: 18, z: 8, w: 4, d: 9, floor: 'deck' },
  ];

  return { width: LOT_W, depth: LOT_D, floors, walls, objects, rooms };
}

export function createSim(options: Partial<Sim> & { name: string }): Sim {
  const id = options.id ?? uid('sim');
  const appearance = cloneAppearance(options.appearance);
  const needs = { hunger: 82, energy: 78, hygiene: 80, fun: 72, social: 68, bladder: 74, ...(options.needs ?? {}) };
  const skills = { cooking: 1, fitness: 1, logic: 1, charisma: 1, creativity: 1, ...(options.skills ?? {}) };
  const skillXp = { cooking: 0, fitness: 0, logic: 0, charisma: 0, creativity: 0, ...(options.skillXp ?? {}) };
  return {
    id,
    name: options.name,
    pronoun: options.pronoun ?? 'elu',
    appearance,
    traits: options.traits ?? ['creative', 'active'],
    aspirationId: options.aspirationId ?? ASPIRATIONS[0].id,
    aspirationDone: options.aspirationDone ?? false,
    needs,
    skills,
    skillXp,
    mood: options.mood ?? 76,
    job: options.job ?? null,
    position: options.position ?? { x: 8, z: 8 },
    facing: options.facing ?? 0,
    path: [],
    pathIndex: 0,
    pending: undefined,
    activity: null,
    relationships: options.relationships ?? {},
    counters: options.counters ?? {},
    atWork: options.atWork ?? false,
    autonomyCooldown: options.autonomyCooldown ?? 8,
  };
}

export function createInitialSims(): Sim[] {
  const tech = CAREERS.find((c) => c.id === 'tech')!;
  const culinary = CAREERS.find((c) => c.id === 'culinary')!;
  const arts = CAREERS.find((c) => c.id === 'arts')!;

  const marina = createSim({
    name: 'Marina Alves', pronoun: 'ela',
    appearance: { skin: '#d49a73', hair: '#3b261f', hairStyle: 'wavy', eyes: '#4b6b53', top: '#c8796b', bottom: '#3f5963', shoes: '#e9e3d8', height: 1.02, build: 1, freckles: true, glasses: false },
    traits: ['creative', 'outgoing'], aspirationId: 'artist',
    skills: { cooking: 2, fitness: 1, logic: 2, charisma: 3, creativity: 4 },
    job: { careerId: tech.id, level: 2, shiftStart: tech.shiftStart, shiftEnd: tech.shiftEnd, lastWorkDay: 0, performance: 78 },
    position: { x: 8, z: 8 }, mood: 84,
  });
  const caio = createSim({
    name: 'Caio Alves', pronoun: 'ele',
    appearance: { skin: '#b87b55', hair: '#2b211d', hairStyle: 'fade', eyes: '#3b3430', top: '#4f6b63', bottom: '#2f3b44', shoes: '#e9e3d8', height: 1.06, build: 1.08, freckles: false, glasses: true },
    traits: ['foodie', 'neat'], aspirationId: 'chef',
    skills: { cooking: 4, fitness: 2, logic: 2, charisma: 1, creativity: 2 },
    job: { careerId: culinary.id, level: 2, shiftStart: culinary.shiftStart, shiftEnd: culinary.shiftEnd, lastWorkDay: 0, performance: 82 },
    position: { x: 12, z: 8 }, mood: 79,
  });
  const livia = createSim({
    name: 'Lívia Santos', pronoun: 'ela',
    appearance: { skin: '#f6d5b8', hair: '#b9814d', hairStyle: 'bun', eyes: '#5b7d9a', top: '#8aa39a', bottom: '#6f6b8a', shoes: '#2f3b44', height: 0.97, build: 0.94, freckles: false, glasses: false },
    traits: ['genius', 'homebody'], aspirationId: 'scholar',
    skills: { cooking: 1, fitness: 2, logic: 4, charisma: 2, creativity: 3 },
    job: { careerId: arts.id, level: 1, shiftStart: arts.shiftStart, shiftEnd: arts.shiftEnd, lastWorkDay: 0, performance: 74 },
    position: { x: 8, z: 14 }, mood: 81,
  });

  marina.relationships = { [caio.id]: 68, [livia.id]: 42 };
  caio.relationships = { [marina.id]: 68, [livia.id]: 35 };
  livia.relationships = { [marina.id]: 42, [caio.id]: 35 };
  return [marina, caio, livia];
}

export function lotValue(lot: Lot) {
  const objectValue = lot.objects.reduce((sum, o) => sum + getDef(o.defId).price * 0.7, 0);
  const wallValue = Object.values(lot.walls).length * 70;
  const floorValue = Object.values(lot.floors).reduce((sum, style) => sum + (FLOOR_STYLES[style]?.price ?? 0) * 0.5, 0);
  return Math.round(objectValue + wallValue + floorValue);
}

export function wallMaterialCost(kind: WallKind | 'erase', style: WallStyleId) {
  if (kind === 'erase') return 0;
  return (WALL_STYLES[style]?.price ?? 90) + (kind === 'door' ? 230 : kind === 'window' ? 150 : 0);
}

export function snapshotLot(lot: Lot) {
  return deepCopy(lot);
}

export function getLotSummary(lot: Lot) {
  const byCategory: Record<string, number> = {};
  for (const o of lot.objects) {
    const def = getDef(o.defId);
    byCategory[def.category] = (byCategory[def.category] ?? 0) + 1;
  }
  return {
    objects: lot.objects.length,
    walls: Object.values(lot.walls).length,
    rooms: lot.rooms.length,
    value: lotValue(lot),
    byCategory,
  };
}

export function seasonTint(day: number) {
  return SEASON_META[seasonFromDay(day)].tint;
}

export function clampNeeds(needs: Sim['needs']): Sim['needs'] {
  const out = { ...needs };
  (Object.keys(out) as Array<keyof Sim['needs']>).forEach((key) => { out[key] = clamp(out[key], 0, 100); });
  return out;
}
