/**
 * Content catalog: traits, aspirations, careers, items, house layout and the
 * bundled characters/NPCs.
 *
 * Everything the player can *see* is translated through i18n keys (e.g.
 * "traits.social"), never with hardcoded UI text, so adding English later only
 * means adding a JSON file.
 *
 * The catalog lives in `shared/` because the server must be able to validate
 * purchases and interactions against the very same numbers.
 */

export type TraitId =
  | 'social'
  | 'lazy'
  | 'curious'
  | 'organized'
  | 'romantic'
  | 'competitive'
  | 'creative'
  | 'shy'
  | 'adventurous'
  | 'bookworm'
  | 'cheerful'
  | 'grumpy'
  | 'foodie'
  | 'athletic'
  | 'artist'
  | 'nightOwl'
  | 'earlyBird'
  | 'charismatic'
  | 'frugal'
  | 'neat';

export type TraitCategory = 'social' | 'work' | 'lifestyle';

export interface TraitDefinition {
  id: TraitId;
  category: TraitCategory;
  emoji: string;
  /** Multipliers applied by the autonomous behavior scoring. */
  needsBias: Partial<Record<'hunger' | 'energy' | 'hygiene' | 'fun' | 'social', number>>;
  /** Skill the trait makes easier to learn (optional). */
  skillBias?: string;
}

export const TRAITS: readonly TraitDefinition[] = [
  { id: 'social', category: 'social', emoji: '💬', needsBias: { social: 1.35 } },
  { id: 'lazy', category: 'lifestyle', emoji: '🛋️', needsBias: { energy: 1.3, fun: 0.8 } },
  { id: 'curious', category: 'work', emoji: '🔭', needsBias: { fun: 1.15 }, skillBias: 'logic' },
  { id: 'organized', category: 'work', emoji: '🗂️', needsBias: { hygiene: 1.15 } },
  { id: 'romantic', category: 'social', emoji: '💕', needsBias: { social: 1.1 } },
  { id: 'competitive', category: 'work', emoji: '🏆', needsBias: { fun: 1.1 } },
  { id: 'creative', category: 'work', emoji: '🎨', needsBias: { fun: 1.2 }, skillBias: 'art' },
  { id: 'shy', category: 'social', emoji: '🤫', needsBias: { social: 0.75 } },
  { id: 'adventurous', category: 'lifestyle', emoji: '🧭', needsBias: { fun: 1.2 } },
  { id: 'bookworm', category: 'work', emoji: '📚', needsBias: { fun: 1.1 }, skillBias: 'writing' },
  { id: 'cheerful', category: 'lifestyle', emoji: '😄', needsBias: { social: 1.15 } },
  { id: 'grumpy', category: 'lifestyle', emoji: '😤', needsBias: { social: 0.8 } },
  { id: 'foodie', category: 'lifestyle', emoji: '🍰', needsBias: { hunger: 1.3 }, skillBias: 'cooking' },
  { id: 'athletic', category: 'lifestyle', emoji: '🏃', needsBias: { energy: 1.1 }, skillBias: 'fitness' },
  { id: 'artist', category: 'work', emoji: '🖌️', needsBias: { fun: 1.15 }, skillBias: 'paint' },
  { id: 'nightOwl', category: 'lifestyle', emoji: '🦉', needsBias: { energy: 0.9 } },
  { id: 'earlyBird', category: 'lifestyle', emoji: '🌅', needsBias: { energy: 1.1 } },
  { id: 'charismatic', category: 'social', emoji: '✨', needsBias: { social: 1.25 }, skillBias: 'charisma' },
  { id: 'frugal', category: 'lifestyle', emoji: '🪙', needsBias: {} },
  { id: 'neat', category: 'lifestyle', emoji: '🧼', needsBias: { hygiene: 1.3 } },
] as const;

export function traitById(id: string): TraitDefinition | undefined {
  return TRAITS.find((trait) => trait.id === id);
}

export const ASPIRATIONS = [
  'chef',
  'artist',
  'family',
  'explorer',
  'tycoon',
] as const;

export type AspirationId = (typeof ASPIRATIONS)[number];

export const CAREERS = ['chef', 'programmer', 'artist', 'mechanic', 'clerk'] as const;

export type CareerId = (typeof CAREERS)[number];

export interface CareerDefinition {
  id: CareerId;
  /** Skill that speeds up promotions. */
  skill: string;
  /** Coins per work day, by level (index 0 = level 1). */
  salary: readonly number[];
  /** Work shift in game hours (start hour, duration in hours). */
  shift: { startHour: number; hours: number };
  /** Need penalty applied on every worked hour. */
  strain: Partial<Record<'energy' | 'fun' | 'social' | 'bladder', number>>;
}

/**
 * Skill trained by each career (`chef` -> `cooking`).
 *
 * Kept as a standalone table because the world keeps skills keyed by
 * `SkillId`, not by career id: reading `skills[careerId]` was a real bug that
 * made every promotion run on a zero skill level.
 */
export const CAREER_SKILL: Readonly<Record<CareerId, string>> = {
  chef: 'cooking',
  programmer: 'programming',
  artist: 'paint',
  mechanic: 'logic',
  clerk: 'charisma',
};

export const CAREER_DEFINITIONS: Record<CareerId, CareerDefinition> = {
  chef: {
    id: 'chef',
    skill: 'cooking',
    salary: [45, 70, 100, 140, 190],
    shift: { startHour: 10, hours: 6 },
    strain: { energy: 6, fun: 3, bladder: 2 },
  },
  programmer: {
    id: 'programmer',
    skill: 'programming',
    salary: [60, 90, 130, 180, 240],
    shift: { startHour: 9, hours: 7 },
    strain: { energy: 8, fun: 4, social: 3 },
  },
  artist: {
    id: 'artist',
    skill: 'paint',
    salary: [40, 65, 95, 135, 185],
    shift: { startHour: 13, hours: 5 },
    strain: { energy: 5, fun: 2 },
  },
  mechanic: {
    id: 'mechanic',
    skill: 'logic',
    salary: [50, 75, 105, 145, 195],
    shift: { startHour: 8, hours: 6 },
    strain: { energy: 9, bladder: 3 },
  },
  clerk: {
    id: 'clerk',
    skill: 'charisma',
    salary: [35, 55, 80, 110, 150],
    shift: { startHour: 12, hours: 6 },
    strain: { energy: 4, social: 4 },
  },
};

export function careerNameKey(id: CareerId): string {
  return `careers.${id}`;
}

export const SKILLS = [
  'cooking',
  'writing',
  'paint',
  'programming',
  'fitness',
  'logic',
  'charisma',
] as const;

export type SkillId = (typeof SKILLS)[number];

/* -------------------------------------------------------------------------- */
/*                                  ITEMS                                     */
/* -------------------------------------------------------------------------- */

export type ItemCategory = 'furniture' | 'decor' | 'appliance' | 'electronics' | 'outdoor';

/** Interaction verb the player sees when picking an item. */
export type InteractionId =
  | 'sleep'
  | 'nap'
  | 'eat'
  | 'shower'
  | 'washHands'
  | 'toilet'
  | 'relax'
  | 'watch'
  | 'cook'
  | 'read'
  | 'paint'
  | 'code'
  | 'exercise'
  | 'coffee'
  | 'talk'
  | 'petCat'
  | 'listenMusic'
  | 'stargaze'
  | 'sit'
  | 'drinkWater';

export interface NeedEffect {
  need: 'hunger' | 'energy' | 'hygiene' | 'bladder' | 'fun' | 'social' | 'mood';
  amount: number;
}

export interface CatalogItem {
  id: string;
  category: ItemCategory;
  price: number;
  /** Size in grid cells (room base uses 0.5 m cells; 1 cell = 1 world unit later). */
  size: { w: number; h: number };
  /** Default interaction when tapping once. */
  primaryAction: InteractionId;
  /** Extra interactions offered in the context sheet. */
  actions?: InteractionId[];
  /** Needs changed when the interaction completes. */
  effects: Partial<Record<InteractionId, NeedEffect[]>>;
  /** Game minutes the interaction takes (allows fast-forwarding). */
  durations: Partial<Record<InteractionId, number>>;
  skill?: SkillId;
  /** Local path under /assets, resolved by the art module. */
  sprite: string;
  /** Placement rules. */
  placement: 'floor' | 'wall' | 'outdoor';
}

export const ITEMS: readonly CatalogItem[] = [
  {
    id: 'bed',
    category: 'furniture',
    price: 220,
    size: { w: 2, h: 2 },
    primaryAction: 'sleep',
    actions: ['sleep', 'nap'],
    effects: {
      sleep: [
        { need: 'energy', amount: 62 },
        { need: 'hygiene', amount: -6 },
        { need: 'bladder', amount: -10 },
        { need: 'mood', amount: 8 },
      ],
      nap: [{ need: 'energy', amount: 22 }, { need: 'mood', amount: 2 }],
    },
    durations: { sleep: 480, nap: 90 },
    sprite: 'bed',
    placement: 'floor',
  },
  {
    id: 'fridge',
    category: 'appliance',
    price: 180,
    size: { w: 1, h: 2 },
    primaryAction: 'eat',
    actions: ['eat', 'cook', 'drinkWater'],
    effects: {
      eat: [{ need: 'hunger', amount: 38 }, { need: 'mood', amount: 4 }],
      cook: [
        { need: 'hunger', amount: 58 },
        { need: 'fun', amount: 8 },
        { need: 'mood', amount: 6 },
      ],
      drinkWater: [{ need: 'bladder', amount: -8 }, { need: 'mood', amount: 3 }],
    },
    durations: { eat: 25, cook: 60, drinkWater: 5 },
    skill: 'cooking',
    sprite: 'fridge',
    placement: 'floor',
  },
  {
    id: 'shower',
    category: 'appliance',
    price: 120,
    size: { w: 1, h: 1 },
    primaryAction: 'shower',
    actions: ['shower', 'washHands'],
    effects: {
      shower: [{ need: 'hygiene', amount: 55 }, { need: 'mood', amount: 6 }],
      washHands: [{ need: 'hygiene', amount: 12 }],
    },
    durations: { shower: 25, washHands: 3 },
    sprite: 'shower',
    placement: 'floor',
  },
  {
    id: 'toilet',
    category: 'appliance',
    price: 90,
    size: { w: 1, h: 1 },
    primaryAction: 'toilet',
    actions: ['toilet'],
    effects: { toilet: [{ need: 'bladder', amount: 100 }] },
    durations: { toilet: 10 },
    sprite: 'toilet',
    placement: 'floor',
  },
  {
    id: 'stove',
    category: 'appliance',
    price: 210,
    size: { w: 2, h: 1 },
    primaryAction: 'cook',
    actions: ['cook'],
    effects: {
      cook: [
        { need: 'hunger', amount: 62 },
        { need: 'fun', amount: 10 },
        { need: 'mood', amount: 8 },
      ],
    },
    durations: { cook: 55 },
    skill: 'cooking',
    sprite: 'stove',
    placement: 'floor',
  },
  {
    id: 'sink',
    category: 'appliance',
    price: 95,
    size: { w: 1, h: 1 },
    primaryAction: 'washHands',
    actions: ['washHands', 'drinkWater'],
    effects: {
      washHands: [{ need: 'hygiene', amount: 14 }],
      drinkWater: [{ need: 'mood', amount: 3 }],
    },
    durations: { washHands: 4, drinkWater: 2 },
    sprite: 'sink',
    placement: 'floor',
  },
  {
    id: 'sofa',
    category: 'furniture',
    price: 150,
    size: { w: 2, h: 1 },
    primaryAction: 'relax',
    actions: ['relax', 'sit'],
    effects: {
      relax: [{ need: 'fun', amount: 22 }, { need: 'energy', amount: 10 }, { need: 'mood', amount: 5 }],
      sit: [{ need: 'energy', amount: 4 }],
    },
    durations: { relax: 45, sit: 15 },
    sprite: 'sofa',
    placement: 'floor',
  },
  {
    id: 'tv',
    category: 'electronics',
    price: 260,
    size: { w: 2, h: 1 },
    primaryAction: 'watch',
    actions: ['watch', 'listenMusic'],
    effects: {
      watch: [{ need: 'fun', amount: 34 }, { need: 'energy', amount: 5 }, { need: 'mood', amount: 4 }],
      listenMusic: [{ need: 'fun', amount: 22 }, { need: 'mood', amount: 7 }, { need: 'social', amount: 5 }],
    },
    durations: { watch: 60, listenMusic: 40 },
    sprite: 'tv',
    placement: 'floor',
  },
  {
    id: 'plant',
    category: 'decor',
    price: 35,
    size: { w: 1, h: 1 },
    primaryAction: 'relax',
    actions: ['relax'],
    effects: { relax: [{ need: 'mood', amount: 6 }, { need: 'fun', amount: 3 }] },
    durations: { relax: 10 },
    sprite: 'plant',
    placement: 'floor',
  },
  {
    id: 'lamp',
    category: 'decor',
    price: 45,
    size: { w: 1, h: 1 },
    primaryAction: 'relax',
    actions: ['relax'],
    effects: { relax: [{ need: 'mood', amount: 4 }] },
    durations: { relax: 5 },
    sprite: 'lamp',
    placement: 'floor',
  },
  {
    id: 'desk',
    category: 'furniture',
    price: 170,
    size: { w: 2, h: 1 },
    primaryAction: 'code',
    actions: ['code', 'read', 'paint'],
    effects: {
      code: [{ need: 'fun', amount: 16 }, { need: 'energy', amount: -5 }],
      read: [{ need: 'fun', amount: 18 }, { need: 'mood', amount: 5 }],
      paint: [{ need: 'fun', amount: 20 }, { need: 'mood', amount: 8 }],
    },
    durations: { code: 90, read: 45, paint: 70 },
    skill: 'programming',
    sprite: 'desk',
    placement: 'floor',
  },
  {
    id: 'bookshelf',
    category: 'furniture',
    price: 140,
    size: { w: 2, h: 1 },
    primaryAction: 'read',
    actions: ['read'],
    effects: { read: [{ need: 'fun', amount: 24 }, { need: 'mood', amount: 6 }] },
    durations: { read: 60 },
    skill: 'writing',
    sprite: 'bookshelf',
    placement: 'floor',
  },
  {
    id: 'coffeeTable',
    category: 'furniture',
    price: 80,
    size: { w: 2, h: 1 },
    primaryAction: 'coffee',
    actions: ['coffee'],
    effects: { coffee: [{ need: 'energy', amount: 16 }, { need: 'mood', amount: -2 }] },
    durations: { coffee: 15 },
    sprite: 'coffeeTable',
    placement: 'floor',
  },
  {
    id: 'catBed',
    category: 'decor',
    price: 60,
    size: { w: 1, h: 1 },
    primaryAction: 'petCat',
    actions: ['petCat'],
    effects: { petCat: [{ need: 'social', amount: 10 }, { need: 'mood', amount: 9 }, { need: 'fun', amount: 8 }] },
    durations: { petCat: 15 },
    sprite: 'catBed',
    placement: 'floor',
  },
  {
    id: 'rug',
    category: 'decor',
    price: 55,
    size: { w: 3, h: 2 },
    primaryAction: 'relax',
    actions: ['relax'],
    effects: { relax: [{ need: 'mood', amount: 3 }] },
    durations: { relax: 5 },
    sprite: 'rug',
    placement: 'floor',
  },
  {
    id: 'piano',
    category: 'furniture',
    price: 400,
    size: { w: 3, h: 1 },
    primaryAction: 'listenMusic',
    actions: ['listenMusic', 'paint'],
    effects: {
      listenMusic: [{ need: 'fun', amount: 30 }, { need: 'social', amount: 12 }, { need: 'mood', amount: 9 }],
      paint: [{ need: 'fun', amount: 18 }, { need: 'mood', amount: 6 }],
    },
    durations: { listenMusic: 50, paint: 60 },
    skill: 'paint',
    sprite: 'piano',
    placement: 'floor',
  },
  {
    id: 'treadmill',
    category: 'furniture',
    price: 320,
    size: { w: 2, h: 1 },
    primaryAction: 'exercise',
    actions: ['exercise'],
    effects: { exercise: [{ need: 'fun', amount: 12 }, { need: 'energy', amount: -12 }, { need: 'hygiene', amount: -9 }, { need: 'mood', amount: 7 }] },
    durations: { exercise: 50 },
    skill: 'fitness',
    sprite: 'treadmill',
    placement: 'floor',
  },
  {
    id: 'mirror',
    category: 'decor',
    price: 70,
    size: { w: 1, h: 2 },
    primaryAction: 'washHands',
    actions: ['washHands'],
    effects: { washHands: [{ need: 'mood', amount: 3 }, { need: 'hygiene', amount: 4 }] },
    durations: { washHands: 8 },
    sprite: 'mirror',
    placement: 'wall',
  },
  {
    id: 'painting',
    category: 'decor',
    price: 95,
    size: { w: 2, h: 1 },
    primaryAction: 'relax',
    actions: ['relax'],
    effects: { relax: [{ need: 'mood', amount: 4 }, { need: 'fun', amount: 2 }] },
    durations: { relax: 5 },
    sprite: 'painting',
    placement: 'wall',
  },
  {
    id: 'bench',
    category: 'outdoor',
    price: 65,
    size: { w: 2, h: 1 },
    primaryAction: 'sit',
    actions: ['sit', 'stargaze'],
    effects: {
      sit: [{ need: 'energy', amount: 6 }, { need: 'fun', amount: 6 }],
      stargaze: [{ need: 'fun', amount: 16 }, { need: 'mood', amount: 10 }],
    },
    durations: { sit: 20, stargaze: 45 },
    sprite: 'bench',
    placement: 'outdoor',
  },
] as const;

/**
 * Interactions the autonomous AI may start on its own.
 *
 * The rule of thumb: an action must be a "need fix" the character would do
 * without being asked. Social actions (talking), repairs and anything that
 * spends money stay manual — the player is the one who decides to socialise.
 * Also used by the UI to show a small "AI" badge on the actions it can pick.
 */
export const AI_INTERACTIONS: readonly InteractionId[] = [
  'sleep',
  'nap',
  'eat',
  'drinkWater',
  'cook',
  'shower',
  'washHands',
  'toilet',
  'relax',
  'watch',
  'read',
  'paint',
  'code',
  'exercise',
  'coffee',
  'petCat',
  'listenMusic',
  'stargaze',
];

/**
 * Interactions the catalog offers for an item (primary action first).
 *
 * Lives here instead of `simulation.ts` because `content.ts` must not import
 * the simulation module (the simulation imports the content).
 */
export function interactionsFor(itemId: string): InteractionId[] {
  const item = itemById(itemId);
  if (!item) return [];
  const list = [item.primaryAction, ...(item.actions ?? [])];
  return [...new Set(list)];
}

export function autoAssignableInteractions(itemId: string): InteractionId[] {
  return interactionsFor(itemId).filter((interactionId) => AI_INTERACTIONS.includes(interactionId));
}

export function itemById(id: string): CatalogItem | undefined {
  return ITEMS.find((item) => item.id === id);
}

/* -------------------------------------------------------------------------- */
/*                                HOUSE LAYOUT                                */
/* -------------------------------------------------------------------------- */

/**
 * Default house used by the bundled save. Grid is 22 x 16 cells, 0 = floor,
 * 1 = wall. It is a compact apartment: bedroom (top-left), bathroom (top-right),
 * open living room + kitchen (bottom). Keeping the map as ASCII makes it easy
 * to edit by hand and to reason about in tests.
 */
export const HOUSE_GRID: readonly string[] = [
  '1111111111111111111111',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1...................11',
  '1111111111111111111111',
] as const;

export const HOUSE_COLS = 22;
export const HOUSE_ROWS = 16;

export type RoomId = 'bedroom' | 'bathroom' | 'living' | 'kitchen' | 'hall';

export interface HouseItemPlacement {
  id: string;
  itemId: string;
  /** Grid cell of the item's top-left corner. */
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export const DEFAULT_HOUSE_ITEMS: readonly HouseItemPlacement[] = [
  { id: 'item-bed', itemId: 'bed', x: 3, y: 2, rotation: 0 },
  { id: 'item-fridge', itemId: 'fridge', x: 14, y: 2, rotation: 0 },
  { id: 'item-shower', itemId: 'shower', x: 9, y: 2, rotation: 0 },
  { id: 'item-toilet', itemId: 'toilet', x: 9, y: 4, rotation: 0 },
  { id: 'item-sofa', itemId: 'sofa', x: 3, y: 7, rotation: 0 },
  { id: 'item-tv', itemId: 'tv', x: 3, y: 10, rotation: 0 },
  { id: 'item-plant', itemId: 'plant', x: 19, y: 2, rotation: 0 },
  { id: 'item-lamp', itemId: 'lamp', x: 19, y: 7, rotation: 0 },
  { id: 'item-desk', itemId: 'desk', x: 13, y: 7, rotation: 0 },
  { id: 'item-bookshelf', itemId: 'bookshelf', x: 16, y: 11, rotation: 0 },
  { id: 'item-coffeeTable', itemId: 'coffeeTable', x: 6, y: 7, rotation: 0 },
  { id: 'item-catBed', itemId: 'catBed', x: 12, y: 13, rotation: 0 },
] as const;

export interface HouseModel {
  id: string;
  name: string;
  grid: readonly string[];
  items: readonly HouseItemPlacement[];
}

export const DEFAULT_HOUSE: HouseModel = {
  id: 'house-default',
  name: 'house.defaultName',
  grid: HOUSE_GRID,
  items: DEFAULT_HOUSE_ITEMS,
};

/* -------------------------------------------------------------------------- */
/*                         ROOM LAYOUT (PHASE 1 SCENE)                        */
/* -------------------------------------------------------------------------- */

/**
 * The Phase 1 room is the apartment the player actually walks in: one open
 * studio with bedroom, kitchen and bathroom, described in **grid cells**
 * (22 x 16, ~0.5 m each). Collision, pathfinding and the art all read from this
 * list, so moving a piece of furniture is a one-line change here.
 *
 * `cell` is the top-left of the footprint (row 0 = against the back wall).
 * `art` is the measured SVG size and `scale` converts it to design pixels;
 * the renderer puts the art's bottom-center exactly on the footprint's
 * bottom-center, which is what makes collision match what you see.
 */
export interface RoomPlacement {
  /** Instance id, stable across saves ("item-bed"). */
  id: string;
  /** Catalog item id (see ITEMS) or a decor-only sprite id. */
  itemId: string;
  /** Top-left cell of the footprint. */
  cell: { x: number; y: number };
  /** Footprint in cells (w = horizontal, d = depth towards the camera). */
  footprint: { w: number; d: number };
  /** Measured art: width / height in SVG units at scale 1. */
  art: { w: number; h: number };
  /** Design pixels per SVG pixel. */
  scale: number;
  /** Painter row hint: back wall pieces first, front frames the screen. */
  layer: 'back' | 'floor' | 'front';
  /** Horizontal flip of the art (mirrors handles/doors). */
  flip?: boolean;
  /** Scene hotspot size for touch (design px, always >= 44). */
  hit: { w: number; h: number };
  /** i18n key of the object name. */
  labelKey: string;
  /** Rugs and paths can be walked over. */
  walkOver?: boolean;
  /** Ground decals are painted right after the floor, under everything. */
  flat?: boolean;
  /** False for pure decor (no tap action). */
  interactive?: boolean;
}

/**
 * Measured sizes of the Phase 1 art set (see roomSvg.ts). Exposed here because
 * collision and hit areas depend on them, and the scene must not guess.
 */
export const ROOM_ART_SIZES: Readonly<Record<string, { w: number; h: number }>> = {
  bed: { w: 120, h: 84 },
  sofa: { w: 104, h: 76 },
  fridge: { w: 56, h: 128 },
  stove: { w: 96, h: 92 },
  sink: { w: 66, h: 96 },
  toilet: { w: 52, h: 78 },
  shower: { w: 74, h: 134 },
  rug: { w: 210, h: 66 },
  coffeeTable: { w: 96, h: 46 },
  plant: { w: 42, h: 92 },
  lamp: { w: 46, h: 118 },
  bookshelf: { w: 44, h: 112 },
  cat: { w: 72, h: 40 },
  catBed: { w: 78, h: 34 },
  tv: { w: 104, h: 88 },
  desk: { w: 112, h: 86 },
  piano: { w: 120, h: 104 },
  treadmill: { w: 96, h: 96 },
  mirror: { w: 54, h: 116 },
  painting: { w: 72, h: 56 },
  bench: { w: 112, h: 62 },
};

export const ROOM_PLACEMENTS: readonly RoomPlacement[] = [
  // ==== back row (against the wall) ======================================
  { id: 'item-bed', itemId: 'bed', cell: { x: 0, y: 0 }, footprint: { w: 7, d: 3 }, art: ROOM_ART_SIZES.bed!, scale: 0.95, layer: 'back', hit: { w: 128, h: 96 }, labelKey: 'items.bed' },
  { id: 'item-bookshelf', itemId: 'bookshelf', cell: { x: 7, y: 0 }, footprint: { w: 2, d: 2 }, art: ROOM_ART_SIZES.bookshelf!, scale: 0.72, layer: 'back', hit: { w: 46, h: 84 }, labelKey: 'items.bookshelf' },
  { id: 'item-fridge', itemId: 'fridge', cell: { x: 9, y: 0 }, footprint: { w: 3, d: 3 }, art: ROOM_ART_SIZES.fridge!, scale: 0.72, layer: 'back', hit: { w: 50, h: 96 }, labelKey: 'items.fridge' },
  { id: 'item-stove', itemId: 'stove', cell: { x: 12, y: 0 }, footprint: { w: 3, d: 2 }, art: ROOM_ART_SIZES.stove!, scale: 0.66, layer: 'back', hit: { w: 66, h: 64 }, labelKey: 'items.stove' },
  { id: 'item-sink', itemId: 'sink', cell: { x: 15, y: 0 }, footprint: { w: 2, d: 2 }, art: ROOM_ART_SIZES.sink!, scale: 0.6, layer: 'back', hit: { w: 46, h: 62 }, labelKey: 'items.sink' },
  { id: 'item-toilet', itemId: 'toilet', cell: { x: 17, y: 0 }, footprint: { w: 2, d: 2 }, art: ROOM_ART_SIZES.toilet!, scale: 0.72, layer: 'back', hit: { w: 46, h: 60 }, labelKey: 'items.toilet' },
  { id: 'item-shower', itemId: 'shower', cell: { x: 19, y: 0 }, footprint: { w: 3, d: 3 }, art: ROOM_ART_SIZES.shower!, scale: 0.64, layer: 'back', hit: { w: 52, h: 88 }, labelKey: 'items.shower' },

  // ==== middle (walkable band) ===========================================
  { id: 'item-rug', itemId: 'rug', cell: { x: 1, y: 8 }, footprint: { w: 7, d: 3 }, art: ROOM_ART_SIZES.rug!, scale: 0.86, layer: 'floor', hit: { w: 60, h: 48 }, labelKey: 'items.rug', walkOver: true, flat: true, interactive: false },
  { id: 'item-coffeeTable', itemId: 'coffeeTable', cell: { x: 2, y: 8 }, footprint: { w: 4, d: 2 }, art: ROOM_ART_SIZES.coffeeTable!, scale: 0.8, layer: 'floor', hit: { w: 86, h: 52 }, labelKey: 'items.coffeeTable' },
  { id: 'item-cat', itemId: 'catBed', cell: { x: 9, y: 10 }, footprint: { w: 1, d: 1 }, art: ROOM_ART_SIZES.catBed!, scale: 0.8, layer: 'floor', hit: { w: 64, h: 48 }, labelKey: 'items.catBed' },

  // ==== front (frames the bottom of the screen) ==========================
  { id: 'item-sofa', itemId: 'sofa', cell: { x: 0, y: 12 }, footprint: { w: 6, d: 3 }, art: ROOM_ART_SIZES.sofa!, scale: 0.92, layer: 'front', hit: { w: 108, h: 76 }, labelKey: 'items.sofa' },
  { id: 'item-plant', itemId: 'plant', cell: { x: 20, y: 12 }, footprint: { w: 1, d: 1 }, art: ROOM_ART_SIZES.plant!, scale: 0.72, layer: 'front', hit: { w: 46, h: 72 }, labelKey: 'items.plant', interactive: false },
  { id: 'item-lamp', itemId: 'lamp', cell: { x: 17, y: 13 }, footprint: { w: 1, d: 1 }, art: ROOM_ART_SIZES.lamp!, scale: 0.7, layer: 'front', hit: { w: 44, h: 86 }, labelKey: 'items.lamp', interactive: false },
] as const;

/** Items the tutorial/AI care about, in the order they appear in the house. */
export const CORE_ITEM_IDS = ['bed', 'fridge', 'shower', 'toilet', 'sofa'] as const;
export type CoreItemId = (typeof CORE_ITEM_IDS)[number];

/** Placement that houses a given catalog item (default house). */
export function placementForItem(itemId: string): RoomPlacement | undefined {
  return ROOM_PLACEMENTS.find((placement) => placement.itemId === itemId);
}

/* -------------------------------------------------------------------------- */
/*                                 TUTORIAL                                   */
/* -------------------------------------------------------------------------- */

export type TutorialStepId = 'move' | 'eat' | 'shower' | 'toilet' | 'sleep';

export interface TutorialStepDefinition {
  id: TutorialStepId;
  /** Object the player should tap first (null = any floor tile). */
  targetItemId: string | null;
  /** Interaction to run on that object. */
  interactionId?: InteractionId;
  /** Where the step explanation lives in the i18n file. */
  textKey: string;
}

export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  { id: 'move', targetItemId: null, textKey: 'tutorial.steps.move' },
  { id: 'eat', targetItemId: 'fridge', interactionId: 'eat', textKey: 'tutorial.steps.eat' },
  { id: 'shower', targetItemId: 'shower', interactionId: 'shower', textKey: 'tutorial.steps.shower' },
  { id: 'toilet', targetItemId: 'toilet', interactionId: 'toilet', textKey: 'tutorial.steps.toilet' },
  { id: 'sleep', targetItemId: 'bed', interactionId: 'sleep', textKey: 'tutorial.steps.sleep' },
] as const;

/**
 * Suggested object for a critical need — powers the HUD "!" shortcut. Ordered
 * by what actually fixes the need the fastest in the default house.
 */
export function itemForNeed(need: string): string | null {
  switch (need) {
    case 'hunger':
      return 'fridge';
    case 'energy':
      return 'bed';
    case 'hygiene':
      return 'shower';
    case 'bladder':
      return 'toilet';
    case 'fun':
      return 'sofa';
    case 'social':
      return 'fridge'; // cooking/eating together is the social hook until Phase 2
    case 'mood':
      return 'sofa';
    default:
      return null;
  }
}

/** Interaction that restores a need on an item (used by the shortcut). */
export function fixInteractionFor(need: string): InteractionId | null {
  switch (need) {
    case 'hunger':
      return 'eat';
    case 'social':
      return 'cook';
    case 'mood':
      return 'relax';
    default:
      return null;
  }
}

/** Tuning knobs used across screens. Kept in one place for easy balancing. */
export const GAME_CONFIG = {
  /** Real seconds per game day (24 real minutes by default). */
  dayLengthSeconds: 1440,
  /** Starting money in coins. */
  startingMoney: 400,
  /** Max items placed in the apartment (performance guard). */
  maxHouseItems: 200,
  /** Game minutes the player may skip ahead at once. */
  maxFastForwardMinutes: 480,
  /** Minimum needed to leave for work. */
  workArriveMinutesBefore: 15,
} as const;
