/**
 * Dev-only layout preview.
 *
 * Mirrors exactly what RoomScene paints: same background constants, same
 * painter's order (sort by bottom y), same bottom-center anchors and scales.
 * Rendering it here (no WebGL) makes it possible to iterate on composition in
 * seconds and to review changes in a PR.
 *
 * Usage: npx tsx scripts/preview-layout.ts [out.png] [width] [height]
 */
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { characterSvg } from '../src/game/art/characterSvg';
import { FURNITURE, TEXTURES } from '../src/game/art/roomSvg';
import {
  CHARACTER_DESIGN_WIDTH,
  CHARACTER_HOME,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  ROOM,
  ROOM_ITEMS,
} from '../src/game/layout';
import { DEFAULT_APPEARANCE } from '@vida/shared';

const out = process.argv[2] ?? '/tmp/layout.png';
const scale = Number(process.argv[3] ?? 1);

// Everything is composited at the final scale so design-unit coordinates and
// the rasterized art match 1:1 (the scene does the same with camera zoom).
const W = Math.round(DESIGN_WIDTH * scale);
const H = Math.round(DESIGN_HEIGHT * scale);
const U = scale; // one design unit in output pixels

const items = new Map(FURNITURE.map((spec) => [spec.key, spec]));
const deco = new Map(Object.entries(TEXTURES));

function backgroundSvg(): string {
  const planks: string[] = [];
  const plankHeight = 34 * U;
  for (let y = (ROOM.wallBottom + 26) * U; y < H; y += plankHeight) {
    planks.push(`<rect x="-400" y="${y}" width="${W + 800}" height="${1.5 * U}" fill="#E4C29C" opacity="0.65"/>`);
  }
  const stripes: string[] = [];
  for (let x = -400; x < W + 400; x += 34 * U) {
    stripes.push(`<rect x="${x}" y="-400" width="${2 * U}" height="${ROOM.wallBottom * U + 400}" fill="#FFFFFF" opacity="0.32"/>`);
  }
  const tiles: string[] = [];
  // Kitchen backsplash behind the counter (subtle tile grid).
  for (let y = 300 * U; y < 430 * U; y += 22 * U) {
    for (let x = 200 * U; x < 400 * U; x += 26 * U) {
      tiles.push(
        `<rect x="${x}" y="${y}" width="${24 * U}" height="${20 * U}" rx="${3 * U}" fill="#FFFFFF" opacity="0.42" stroke="#DCE9F0" stroke-width="${U}"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFBF3"/>
        <stop offset="1" stop-color="#FFF1DE"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F8E3C8"/>
        <stop offset="1" stop-color="#EBCBA6"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#FFF6E9"/>
    <rect width="${W}" height="${ROOM.wallBottom * U}" fill="url(#wall)"/>
    ${stripes.join('')}
    ${tiles.join('')}
    <rect y="${(ROOM.wallBottom - 8) * U}" width="${W}" height="${10 * U}" fill="#E3C8A9"/>
    <rect y="${(ROOM.wallBottom + 2) * U}" width="${W}" height="${H - ROOM.wallBottom * U}" fill="url(#floor)"/>
    ${planks.join('')}
  </svg>`;
}

const layers: OverlayOptions[] = [];
/**
 * Same math as RoomScene: `itemScale` is design px per SVG px, so the output
 * width in pixels is svgWidth * itemScale * pxPerDesignUnit.
 */
const place = async (raw: string, x: number, y: number, itemScale: number, flip = false) => {
  const png = await sharp(Buffer.from(raw), { density: 96 }).png().toBuffer();
  const meta = await sharp(png).metadata();
  const w = Math.max(1, Math.round((meta.width ?? 0) * itemScale * U));
  const resized = flip
    ? await sharp(png).resize({ width: w }).flop().png().toBuffer()
    : await sharp(png).resize({ width: w }).png().toBuffer();
  const finalMeta = await sharp(resized).metadata();
  // Crop pieces that intentionally bleed off-screen so compositing stays valid.
  const w2 = finalMeta.width ?? 0;
  const h2 = finalMeta.height ?? 0;
  const rawLeft = Math.round(x * U - w2 / 2);
  const rawTop = Math.round(y * U - h2);
  const cw = Math.min(w2, W - Math.max(0, rawLeft)) - Math.max(0, -rawLeft);
  const ch = Math.min(h2, H - Math.max(0, rawTop)) - Math.max(0, -rawTop);
  if (cw <= 0 || ch <= 0) return;
  const cropped = await sharp(resized)
    .extract({ left: Math.max(0, -rawLeft), top: Math.max(0, -rawTop), width: cw, height: ch })
    .png()
    .toBuffer();
  layers.push({ input: cropped, left: Math.max(0, rawLeft), top: Math.max(0, rawTop) });
};

// Background.
layers.push({ input: Buffer.from(backgroundSvg()), left: 0, top: 0 });

// Room items: back to front (exactly like the scene).
const sorted = [...ROOM_ITEMS].sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
for (const item of sorted) {
  let raw: string | undefined;
  if (item.texture.startsWith('furniture-')) {
    raw = items.get(item.texture.replace('furniture-', ''))?.svg();
  } else if (item.texture.startsWith('deco-')) {
    raw = deco.get(item.texture.replace('deco-', ''))?.();
  }
  if (!raw) continue;
  await place(raw, item.x, item.y, item.scale, item.flip);
}

// Character (in the foreground).
await place(characterSvg(DEFAULT_APPEARANCE, { mood: 'happy' }), CHARACTER_HOME.x, CHARACTER_HOME.y, 2 * CHARACTER_DESIGN_WIDTH / 240);

await sharp({
  create: { width: W, height: H, channels: 4, background: '#FFF6E9' },
})
  .composite(layers)
  .png()
  .toFile(out);

console.log('wrote', out);
