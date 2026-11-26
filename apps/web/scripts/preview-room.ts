/**
 * Dev-only preview of the Phase 1 scene.
 *
 * Builds **one SVG document** with the background and every placement at its
 * exact design-space coordinates (converted from the same `roomGeometry` module
 * the Phaser scene uses), then rasterizes once. No resize math, no drift: what
 * you see is what the scene draws.
 *
 * Usage: npx tsx scripts/preview-room.ts [out.png] [scale]
 */
import sharp from 'sharp';
import {
  CHARACTER_DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  FLOOR_TOP,
  cellToScreen,
  depthFor,
  projectRect,
} from '../src/game/roomGeometry';
import { roomBackgroundSvg } from '../src/game/art/roomBackground';
import { characterSvg } from '../src/game/art/characterSvg';
import { FURNITURE } from '../src/game/art/roomSvg';
import { DEFAULT_APPEARANCE, ROOM_PLACEMENTS, type Appearance } from '@vida/shared';

const out = process.argv[2] ?? '/tmp/room-preview.png';
const scale = Number(process.argv[3] ?? 2);

const furniture = new Map(FURNITURE.map((spec) => [spec.key, spec]));

/** Extracts the inner markup of an SVG string (everything between the tags). */
function inner(raw: string): string {
  return raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function svgSize(raw: string): { w: number; h: number } {
  const w = Number(/\bwidth="([\d.]+)"/.exec(raw)?.[1] ?? 120);
  const h = Number(/\bheight="([\d.]+)"/.exec(raw)?.[1] ?? 120);
  return { w, h };
}

interface Layer {
  depth: number;
  markup: string;
  /** Bottom-center anchor in design units. */
  x: number;
  y: number;
}

const layers: Layer[] = [];

for (const placement of ROOM_PLACEMENTS) {
  const spec = furniture.get(placement.itemId);
  if (!spec) continue;
  const raw = spec.svg();
  const size = svgSize(raw);
  const rect = projectRect(placement.cell, placement.footprint);
  const targetW = size.w * placement.scale;
  const targetH = size.h * placement.scale;
  const flip = placement.flip ? `scale(-1 1) translate(${-targetW} 0)` : '';
  layers.push({
    depth: placement.flat ? FLOOR_TOP + 1 : depthFor(rect.bottom, placement.layer),
    x: rect.centerX,
    y: rect.bottom,
    markup: `<g transform="translate(${rect.centerX - targetW / 2} ${rect.bottom - targetH}) ${flip} scale(${placement.scale})">${inner(raw)}</g>`,
  });
}

// Character on the spawn cell.
const appearance: Appearance = DEFAULT_APPEARANCE;
const spawn = cellToScreen({ x: 11, y: 7 });
const characterRaw = characterSvg(appearance, { mood: 'happy' });
const characterScale = CHARACTER_DESIGN_WIDTH / 120;
const characterH = 170 * characterScale;
layers.push({
  depth: depthFor(spawn.y),
  x: spawn.x,
  y: spawn.y,
  markup: `<g transform="translate(${spawn.x - CHARACTER_DESIGN_WIDTH / 2} ${spawn.y - characterH}) scale(${characterScale})">${inner(characterRaw)}</g>`,
});

layers.sort((a, b) => a.depth - b.depth);

const background = inner(roomBackgroundSvg());
const document = `<svg xmlns="http://www.w3.org/2000/svg" width="${DESIGN_WIDTH}" height="${DESIGN_HEIGHT}" viewBox="0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}">
  ${background}
  ${layers.map((layer) => layer.markup).join('\n  ')}
</svg>`;

const width = Math.round(DESIGN_WIDTH * scale);
await sharp(Buffer.from(document), { density: 96 })
  .resize({ width })
  .png()
  .toFile(out);

console.log('wrote', out, `(${document.length} chars of SVG)`);
