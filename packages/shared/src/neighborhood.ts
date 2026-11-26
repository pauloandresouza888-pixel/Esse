/** Offline neighborhood and local relationship rules (Phase 2). */

export const NEIGHBORHOOD_LOCATIONS = [
  { id: 'plaza', nameKey: 'neighborhood.locations.plaza', descriptionKey: 'neighborhood.locationDescriptions.plaza', icon: '🌳' },
  { id: 'cafe', nameKey: 'neighborhood.locations.cafe', descriptionKey: 'neighborhood.locationDescriptions.cafe', icon: '☕' },
  { id: 'park', nameKey: 'neighborhood.locations.park', descriptionKey: 'neighborhood.locationDescriptions.park', icon: '🌼' },
] as const;
export type NeighborhoodLocationId = (typeof NEIGHBORHOOD_LOCATIONS)[number]['id'];

export interface RoutineBlock {
  /** Inclusive local game hour. */
  from: number;
  /** Exclusive local game hour. */
  to: number;
  locationId: NeighborhoodLocationId | null;
}

export interface NeighborhoodNpc {
  id: string;
  nameKey: string;
  descriptionKey: string;
  routine: readonly RoutineBlock[];
}

/** NPC day plans are fixed data, so time/location is deterministic. */
export const NEIGHBORHOOD_NPCS: readonly NeighborhoodNpc[] = [
  {
    id: 'mia', nameKey: 'neighborhood.npcs.mia.name', descriptionKey: 'neighborhood.npcs.mia.description',
    routine: [{ from: 0, to: 7, locationId: null }, { from: 7, to: 12, locationId: 'plaza' }, { from: 12, to: 17, locationId: 'cafe' }, { from: 17, to: 21, locationId: 'park' }, { from: 21, to: 24, locationId: null }],
  },
  {
    id: 'leo', nameKey: 'neighborhood.npcs.leo.name', descriptionKey: 'neighborhood.npcs.leo.description',
    routine: [{ from: 0, to: 8, locationId: null }, { from: 8, to: 13, locationId: 'cafe' }, { from: 13, to: 18, locationId: 'plaza' }, { from: 18, to: 22, locationId: 'park' }, { from: 22, to: 24, locationId: null }],
  },
  {
    id: 'bia', nameKey: 'neighborhood.npcs.bia.name', descriptionKey: 'neighborhood.npcs.bia.description',
    routine: [{ from: 0, to: 6, locationId: null }, { from: 6, to: 11, locationId: 'park' }, { from: 11, to: 16, locationId: 'plaza' }, { from: 16, to: 20, locationId: 'cafe' }, { from: 20, to: 24, locationId: null }],
  },
  {
    id: 'caio', nameKey: 'neighborhood.npcs.caio.name', descriptionKey: 'neighborhood.npcs.caio.description',
    routine: [{ from: 0, to: 7, locationId: null }, { from: 7, to: 12, locationId: 'cafe' }, { from: 12, to: 16, locationId: 'park' }, { from: 16, to: 21, locationId: 'plaza' }, { from: 21, to: 24, locationId: null }],
  },
  {
    id: 'noah', nameKey: 'neighborhood.npcs.noah.name', descriptionKey: 'neighborhood.npcs.noah.description',
    routine: [{ from: 0, to: 9, locationId: null }, { from: 9, to: 14, locationId: 'park' }, { from: 14, to: 19, locationId: 'cafe' }, { from: 19, to: 22, locationId: 'plaza' }, { from: 22, to: 24, locationId: null }],
  },
] as const;

export interface Relationship {
  friendship: number;
  romance: number;
  interactions: number;
}
export type RelationshipAction = 'talk' | 'flirt';
export type RelationshipMap = Record<string, Relationship>;

export function emptyRelationship(): Relationship {
  return { friendship: 0, romance: 0, interactions: 0 };
}

/** Clamp values and return a fresh relationship record. */
export function applyRelationshipAction(
  current: Relationship | undefined,
  action: RelationshipAction,
): Relationship {
  const base = current ?? emptyRelationship();
  return {
    friendship: Math.max(0, Math.min(100, base.friendship + (action === 'talk' ? 8 : 3))),
    romance: Math.max(0, Math.min(100, base.romance + (action === 'flirt' ? 6 : 0))),
    interactions: Math.max(0, Math.round(base.interactions)) + 1,
  };
}

/** Returns the NPC's current public location, or null when they are at home. */
export function npcLocationAtHour(npcId: string, hour: number): NeighborhoodLocationId | null {
  const npc = NEIGHBORHOOD_NPCS.find((entry) => entry.id === npcId);
  if (!npc) return null;
  const normalized = ((hour % 24) + 24) % 24;
  return npc.routine.find((block) => normalized >= block.from && normalized < block.to)?.locationId ?? null;
}

export function npcsAtLocation(hour: number, locationId: NeighborhoodLocationId): NeighborhoodNpc[] {
  return NEIGHBORHOOD_NPCS.filter((npc) => npcLocationAtHour(npc.id, hour) === locationId);
}
