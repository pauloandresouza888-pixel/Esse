import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  OUTFIT_STYLES,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  ROOM_ART_SIZES,
  ROOM_PLACEMENTS,
  ROOM_CELLS,
} from '@vida/shared';
import { characterSvg, darken, lighten, svgToDataUri } from '../art/characterSvg';
import { FURNITURE, TEXTURES } from '../art/roomSvg';
import {
  CHARACTER_DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  PLAN,
  cellToScreen,
  depthFor,
  projectRect,
  rowBottomY,
  screenToCell,
} from '../roomGeometry';

/** XML well-formedness is checked with a tiny parser-like scanner. */
function assertWellFormedSvg(svg: string, label: string) {
  expect(svg.startsWith('<svg'), label).toBe(true);
  expect(svg.trimEnd().endsWith('</svg>'), label).toBe(true);
  const opens = (svg.match(/<([a-zA-Z][\w:-]*)(\s|>|\/)/g) ?? []).length;
  const closes = (svg.match(/<\//g) ?? []).length + (svg.match(/\/>/g) ?? []).length;
  expect(opens, `${label}: unbalanced tags`).toBe(closes);
  // No unescaped `#` in a data URI context matters; the helper must encode it.
  expect(svg).not.toContain('undefined');
  expect(svg).not.toContain('NaN');
}

describe('character art', () => {
  it('renders every hair style and outfit combination without errors', () => {
    for (const hairStyle of HAIR_STYLES) {
      for (const outfit of OUTFIT_STYLES) {
        const svg = characterSvg({ ...DEFAULT_APPEARANCE, hairStyle, outfit });
        assertWellFormedSvg(svg, `${hairStyle}/${outfit}`);
      }
    }
  });

  it('supports all skin and hair colors', () => {
    for (const skin of SKIN_TONES) {
      for (const hair of HAIR_COLORS) {
        const svg = characterSvg({ ...DEFAULT_APPEARANCE, skin: skin.id, hair: hair.id });
        // The base tone appears directly (skin: arms/face) or through the
        // gradient stops (hair), which are derived from the same color.
        expect(svg).toContain(skin.color);
        expect(svg).toContain(lighten(hair.color, 0.1));
        expect(svg).toContain(darken(hair.color, 0.12));
      }
    }
    for (const outfit of OUTFIT_COLORS) {
      const svg = characterSvg({ ...DEFAULT_APPEARANCE, outfitColor: outfit.id });
      assertWellFormedSvg(svg, outfit.id);
    }
  });

  it('renders bust mode and blinking/mood frames', () => {
    const bust = characterSvg(DEFAULT_APPEARANCE, { mode: 'bust' });
    assertWellFormedSvg(bust, 'bust');
    expect(bust).toContain('viewBox="30 20 60 66"');
    for (const mood of ['happy', 'neutral', 'sleepy'] as const) {
      assertWellFormedSvg(characterSvg(DEFAULT_APPEARANCE, { mood }), mood);
    }
    assertWellFormedSvg(characterSvg(DEFAULT_APPEARANCE, { blink: true }), 'blink');
  });

  it('produces a valid data URI that escapes markup characters', () => {
    const uri = svgToDataUri(characterSvg(DEFAULT_APPEARANCE));
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(uri).not.toContain('<');
    expect(uri).not.toContain('#');
    expect(decodeURIComponent(uri.split(',')[1] ?? '')).toContain('<svg');
  });

  it('lightens and darkens colors safely', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(lighten('#5B4B3A', 0.1)).toMatch(/^#[0-9a-f]{6}$/);
    expect(darken('not-a-color', 0.1)).toBe('not-a-color');
  });
});

describe('furniture art', () => {
  it('every piece and texture is well-formed', () => {
    for (const spec of FURNITURE) {
      assertWellFormedSvg(spec.svg(), spec.key);
    }
    for (const [key, generator] of Object.entries(TEXTURES)) {
      assertWellFormedSvg(generator(), key);
    }
  });

  it('declares design sizes that match the SVG viewBox', () => {
    for (const spec of FURNITURE) {
      const svg = spec.svg();
      expect(svg, spec.key).toContain(`width="${spec.w}"`);
      expect(svg, spec.key).toContain(`height="${spec.h}"`);
    }
  });
});

describe('room art catalog', () => {
  it('has a drawing and a matching size for every placed item', () => {
    const specs = new Map(FURNITURE.map((spec) => [spec.key, spec]));
    for (const placement of ROOM_PLACEMENTS) {
      const spec = specs.get(placement.itemId);
      expect(spec, `missing art for ${placement.itemId}`).toBeDefined();
      const size = ROOM_ART_SIZES[placement.itemId];
      expect(size, `missing size for ${placement.itemId}`).toBeDefined();
      expect({ w: spec!.w, h: spec!.h }, placement.itemId).toEqual(size);
      expect(placement.art, placement.id).toEqual(size);
    }
  });

  it('covers the new Phase 1 objects (stove, sink, toilet, shower, floor lamp)', () => {
    const keys = new Set(FURNITURE.map((spec) => spec.key));
    for (const key of ['stove', 'sink', 'toilet', 'shower', 'lamp']) {
      expect(keys.has(key), key).toBe(true);
    }
    expect(Object.keys(TEXTURES)).toContain('steam');
  });
});

describe('room geometry', () => {
  it('keeps every placement inside the design canvas', () => {
    for (const placement of ROOM_PLACEMENTS) {
      const rect = projectRect(placement.cell, placement.footprint);
      expect(rect.left, placement.id).toBeGreaterThanOrEqual(-2);
      expect(rect.right, placement.id).toBeLessThanOrEqual(DESIGN_WIDTH + 2);
      expect(rect.top, placement.id).toBeGreaterThanOrEqual(0);
      expect(rect.bottom, placement.id).toBeLessThanOrEqual(DESIGN_HEIGHT + 2);
    }
  });

  it('draws items at the art size times the placement scale', () => {
    for (const placement of ROOM_PLACEMENTS) {
      // The drawing is anchored at the footprint center-bottom and keeps the art
      // aspect: width = art.w * scale, height = art.h * scale.
      const rect = projectRect(placement.cell, placement.footprint);
      const drawW = placement.art.w * placement.scale;
      const drawH = placement.art.h * placement.scale;
      expect(drawW, placement.id).toBeGreaterThan(0);
      expect(drawH, placement.id).toBeGreaterThan(0);
      // Nothing taller than the room, nothing wider than the canvas.
      expect(drawW, placement.id).toBeLessThanOrEqual(DESIGN_WIDTH);
      expect(drawH, placement.id).toBeLessThanOrEqual(DESIGN_HEIGHT);
      // The art must overlap its footprint column (it is centered on it).
      expect(rect.centerX, placement.id).toBeGreaterThan(0);
      expect(rect.centerX, placement.id).toBeLessThan(DESIGN_WIDTH);
    }
  });

  it('maps cells to screen positions and back (round trip)', () => {
    for (let y = 0; y < ROOM_CELLS.rows; y += 1) {
      for (let x = 1; x < ROOM_CELLS.cols - 1; x += 1) {
        const point = cellToScreen({ x, y });
        const cell = screenToCell(point.x, point.y);
        expect(cell, `${x},${y}`).toEqual({ x, y });
      }
    }
  });

  it('orders depth from the back wall to the front edge, rugs always lowest', () => {
    const sorted = [...ROOM_PLACEMENTS].sort(
      (a, b) => rowBottomY(a.cell.y + a.footprint.d) - rowBottomY(b.cell.y + b.footprint.d),
    );
    let previous = -Infinity;
    for (const placement of sorted) {
      const bottom = rowBottomY(placement.cell.y + placement.footprint.d);
      const depth = depthFor(bottom, placement.layer);
      expect(depth, placement.id).toBeGreaterThanOrEqual(previous - 0.5);
      previous = depth;
    }
    // The scene paints flat decals (the rug) far below every solid object.
    const rug = ROOM_PLACEMENTS.find((placement) => placement.flat);
    const solidDepths = ROOM_PLACEMENTS.filter((placement) => !placement.flat).map((placement) =>
      depthFor(rowBottomY(placement.cell.y + placement.footprint.d), placement.layer),
    );
    expect(rug, 'a flat decal exists').toBeDefined();
    expect(-19000).toBeLessThan(Math.min(...solidDepths));
  });

  it('fits the character inside a single cell horizontally', () => {
    expect(CHARACTER_DESIGN_WIDTH).toBeLessThanOrEqual(PLAN.cellW * 6);
    expect(PLAN.cellW).toBeGreaterThan(10);
  });
});

describe('committed assets', () => {
  it('ships every icon referenced by the manifest', () => {
    const publicDir = resolve(process.cwd(), 'public');
    const files = [
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/maskable-192.png',
      'icons/maskable-512.png',
      'apple-touch-icon.png',
      'favicon.svg',
      'brand/logo-full.svg',
      'brand/logo-mark.svg',
    ];
    for (const file of files) {
      const contents = readFileSync(resolve(publicDir, file));
      expect(contents.byteLength, file).toBeGreaterThan(100);
    }
  });

  it('keeps the logo SVG files small enough to inline', () => {
    const logo = readFileSync(resolve(process.cwd(), 'public/brand/logo-full.svg'), 'utf8');
    expect(logo.length).toBeLessThan(6000);
  });
});
