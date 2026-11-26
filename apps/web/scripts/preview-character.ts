/**
 * Dev-only character sheet: renders creator options side by side so face/hairstyle
 * changes can be reviewed without the browser.
 * Usage: npx tsx scripts/preview-character.ts [out.png]
 */
import sharp from 'sharp';
import { characterSvg } from '../src/game/art/characterSvg';
import {
  ACCESSORY_OPTIONS,
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  OUTFIT_STYLES,
  type Appearance,
} from '@vida/shared';

const out = process.argv[2] ?? '/tmp/characters.png';
const CELL_W = 150;
const CELL_H = 210;
const scale = 1.6;

interface Item { label: string; appearance: Appearance; mood?: 'happy' | 'neutral' | 'sleepy' }

const items: Item[] = [
  ...HAIR_STYLES.map((hairStyle) => ({ label: hairStyle, appearance: { ...DEFAULT_APPEARANCE, hairStyle } })),
  ...OUTFIT_STYLES.map((outfit) => ({ label: outfit, appearance: { ...DEFAULT_APPEARANCE, outfit } })),
  ...ACCESSORY_OPTIONS.map((accessory) => ({ label: accessory, appearance: { ...DEFAULT_APPEARANCE, accessory } })),
  { label: 'body slim', appearance: { ...DEFAULT_APPEARANCE, body: 'slim', build: 0.92 } },
  { label: 'body soft', appearance: { ...DEFAULT_APPEARANCE, body: 'soft', build: 1.08 } },
  { label: 'tall', appearance: { ...DEFAULT_APPEARANCE, height: 1.06 } },
  { label: 'short', appearance: { ...DEFAULT_APPEARANCE, height: 0.94 } },
];

const cols = 8;
const rows = Math.ceil(items.length / cols);
const W = cols * CELL_W;
const H = rows * CELL_H;

const cells = items
  .map((item, index) => {
    const col = index % cols;
    const rowIndex = Math.floor(index / cols);
    const x = col * CELL_W;
    const y = rowIndex * CELL_H;
    const inner = characterSvg(item.appearance, { mood: item.mood ?? 'happy' })
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '');
    return `
      <g transform="translate(${x} ${y})">
        <rect width="${CELL_W}" height="${CELL_H}" fill="#FFF9F0" stroke="#F0DCC2" />
        <text x="8" y="18" font-family="sans-serif" font-size="11" fill="#7A6459">${item.label}</text>
        <g transform="translate(${CELL_W / 2 - 60} ${CELL_H - 14 - 170})">${inner}</g>
      </g>`;
  })
  .join('');

const document = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFF9F0" />
  ${cells}
</svg>`;

await sharp(Buffer.from(document), { density: 96 }).resize({ width: Math.round(W * scale) }).png().toFile(out);
console.log('wrote', out);
