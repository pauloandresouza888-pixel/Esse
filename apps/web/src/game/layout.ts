/**
 * Room layout.
 *
 * The scene is designed on a fixed 400x720 "design canvas" in portrait. On a
 * real phone the camera fits that canvas to the screen, so furniture never
 * reflows: it is art with hand-picked coordinates.
 *
 * Rules used to compose the room (they keep it readable on a 5" screen):
 *  1. Two depth rows: "back" pieces hug the wall (bottom y≈470–510) and "front"
 *     pieces frame the bottom of the screen (bottom y≈620–712). The character
 *     walks in the band between them, so nothing important is hidden.
 *  2. Every piece is anchored at its bottom center and sorted by that y — the
 *     whole painter's algorithm, no per-item depth tweaking.
 *  3. The middle of the floor stays open: that is where the character stands and
 *     where Phase 1's tap-to-move path will be drawn.
 *
 * `scale` is always **design pixels per SVG pixel**. The scene converts it to a
 * texture size with `setDisplaySize`, so the art can be re-rasterized at any
 * resolution (see RASTER_SCALE) without changing the layout.
 */
export const DESIGN_WIDTH = 400;
export const DESIGN_HEIGHT = 720;

export const ROOM = {
  wallTop: 0,
  /** Where the wall meets the floor. */
  wallBottom: 292,
  floorBottom: 720,
} as const;

export interface PlacedItem {
  key: string;
  texture: string;
  /** Anchor: bottom center, in design units. */
  x: number;
  y: number;
  /** Design pixels per SVG pixel. */
  scale: number;
  /** Optional horizontal flip. */
  flip?: boolean;
  /** Subtle idle sway (plants, curtains). */
  sway?: boolean;
  /** Depth override; otherwise y is used for painter sorting. */
  depth?: number;
}

/** Hand-composed room, tuned at 390x844 and checked at 360x640. */
export const ROOM_ITEMS: readonly PlacedItem[] = [
  // ==== wall layer ========================================================
  { key: 'windowSky', texture: 'deco-sky', x: 148, y: 274, scale: 1.06, depth: 1 },
  { key: 'windowFrame', texture: 'deco-windowFrame', x: 148, y: 274, scale: 1.06, depth: 2 },
  { key: 'curtains', texture: 'deco-curtains', x: 148, y: 268, scale: 1.02, depth: 3 },
  { key: 'painting', texture: 'furniture-painting', x: 318, y: 250, scale: 0.95, depth: 2 },
  { key: 'clock', texture: 'furniture-clock', x: 318, y: 150, scale: 0.92, depth: 2 },

  // ==== back row (against the wall) =======================================
  { key: 'bed', texture: 'furniture-bed', x: 100, y: 480, scale: 1.25, depth: 480 },
  { key: 'bookshelf', texture: 'furniture-bookshelf', x: 232, y: 492, scale: 1.45, depth: 492 },
  { key: 'fridge', texture: 'furniture-fridge', x: 356, y: 508, scale: 1.32, depth: 508 },
  { key: 'counter', texture: 'furniture-counter', x: 296, y: 574, scale: 1.45, depth: 574 },

  // ==== front row (frames the screen) ====================================
  { key: 'rug', texture: 'furniture-rug', x: 186, y: 624, scale: 1.29, depth: 560 },
  { key: 'coffeeTable', texture: 'furniture-coffeeTable', x: 176, y: 618, scale: 1.33, depth: 618 },
  { key: 'catBed', texture: 'furniture-catBed', x: 330, y: 598, scale: 1.08, depth: 598 },
  { key: 'cat', texture: 'furniture-cat', x: 330, y: 596, scale: 0.98, depth: 599 },
  { key: 'sofa', texture: 'furniture-sofa', x: 82, y: 700, scale: 1.2, depth: 700 },
  { key: 'plant', texture: 'furniture-plant', x: 370, y: 712, scale: 1.24, sway: true, depth: 712 },
] as const;

/** Lamps that light up at night (glow center in design units). */
export const LIGHTS: readonly { x: number; y: number; radius: number; intensity: number }[] = [
  { x: 150, y: 200, radius: 200, intensity: 0.4 },
  { x: 320, y: 300, radius: 150, intensity: 0.28 },
  { x: 196, y: 430, radius: 250, intensity: 0.22 },
] as const;

/** Where the character stands at the start of the game. */
export const CHARACTER_HOME = { x: 252, y: 700 } as const;

/** Design width the character sprite is rendered at. */
export const CHARACTER_DESIGN_WIDTH = 96;

/** Walkable rectangle (design units): the open floor between the two rows. */
export const WALKABLE = {
  minX: 128,
  maxX: 330,
  minY: 636,
  maxY: 706,
} as const;

/**
 * Interactive hotspots.
 *
 * Instead of drawing invisible boxes on top of the art, we declare where each
 * object *is*. The scene maps these to Phaser zones, which is what makes "tap
 * the fridge" reliable even on small screens (44 px minimum, with generous
 * padding around each object).
 */
export interface Hotspot {
  key: string;
  /** Center of the touch area, design units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** i18n key of the object name, shown in the context sheet. */
  labelKey: string;
}

export const HOTSPOTS: readonly Hotspot[] = [
  { key: 'bed', x: 100, y: 426, width: 176, height: 126, labelKey: 'items.bed' },
  { key: 'bookshelf', x: 232, y: 410, width: 86, height: 174, labelKey: 'items.bookshelf' },
  { key: 'fridge', x: 356, y: 420, width: 92, height: 186, labelKey: 'items.fridge' },
  { key: 'counter', x: 296, y: 512, width: 196, height: 136, labelKey: 'items.counter' },
  { key: 'cat', x: 330, y: 570, width: 96, height: 62, labelKey: 'items.cat' },
  { key: 'coffeeTable', x: 176, y: 592, width: 144, height: 64, labelKey: 'items.coffeeTable' },
  { key: 'sofa', x: 82, y: 660, width: 158, height: 104, labelKey: 'items.sofa' },
  { key: 'plant', x: 370, y: 660, width: 64, height: 124, labelKey: 'items.plant' },
] as const;
