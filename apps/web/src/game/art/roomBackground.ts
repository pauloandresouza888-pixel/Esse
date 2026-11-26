/**
 * Room background as an SVG string (Phase 1).
 *
 * Single source of truth for the "empty apartment": wall, wallpaper, window,
 * baseboard and the wooden floor. Phaser rasterizes it once into a texture and
 * the preview scripts embed it in the PNGs. Keeping it as data (instead of
 * Graphics calls inside the scene) is what lets the art be reviewed without a
 * browser.
 */
import { ART } from './palette';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FLOOR_BOTTOM, FLOOR_TOP, PLAN, WALL_BOTTOM } from '../roomGeometry';
import { ROOM_CELLS } from '@vida/shared';

/** Draws `body` in an SVG canvas of the design size (no viewBox scaling). */
function svg(body: string, width = DESIGN_WIDTH, height = DESIGN_HEIGHT): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${body}</svg>`;
}

/** Vertical wall band: wallpaper, subtle stripes and the window niche. */
function wallBody(): string {
  const stripes = Array.from({ length: 12 }, (_, index) => {
    const x = 10 + index * 34;
    return `<rect x="${x}" y="0" width="2" height="${WALL_BOTTOM}" fill="#FFFFFF" opacity="0.34" />`;
  }).join('');

  return `
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFBF3" />
        <stop offset="1" stop-color="#FFF0DC" />
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F8E3C8" />
        <stop offset="1" stop-color="#EBCBA6" />
      </linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#A9D9F2" />
        <stop offset="1" stop-color="#DDEEF7" />
      </linearGradient>
    </defs>
    <rect width="${DESIGN_WIDTH}" height="${WALL_BOTTOM}" fill="url(#wall)" />
    ${stripes}
    <!-- window opening + sky (the scene swaps the sky tint per hour) -->
    <g>
      <rect x="34" y="40" width="132" height="112" rx="10" fill="url(#sky)" />
      <path d="M34 120c22-16 42-10 62 2 20-14 44-18 70-4v34H34v-32Z" fill="#CDE8CB" />
      <circle cx="138" cy="76" r="16" fill="#FFE9A8" opacity="0.9" />
      <path d="M48 72c6-8 16-8 22 0 8-6 16-2 18 6H44c0-3 2-5 4-6Z" fill="#FFFFFF" opacity="0.85" />
      <path d="M52 92c5-6 13-6 18 0 7-5 14-2 16 5H48c0-3 2-4 4-5Z" fill="#FFFFFF" opacity="0.7" />
      <rect x="34" y="40" width="132" height="112" rx="10" fill="none" stroke="${ART.windowFrame}" stroke-width="9" />
      <path d="M100 44v104M38 96h124" stroke="${ART.windowFrame}" stroke-width="6" />
      <rect x="30" y="148" width="140" height="9" rx="4" fill="${ART.white}" />
      <!-- curtains -->
      <path d="M28 44h26c-2 28-6 60-2 92 1 9-6 15-13 13-8-2-11-7-11-14V44Z" fill="${ART.coral}" opacity="0.5" />
      <path d="M146 44h26v91c0 7-3 12-11 14-7 2-14-4-13-13 4-32 0-64-2-92Z" fill="${ART.coral}" opacity="0.5" />
      <path d="M24 42h80" stroke="${ART.woodDark}" stroke-width="4" stroke-linecap="round" />
      <path d="M96 42h80" stroke="${ART.woodDark}" stroke-width="4" stroke-linecap="round" />
    </g>
    <!-- baseboard -->
    <rect x="0" y="${WALL_BOTTOM - 12}" width="${DESIGN_WIDTH}" height="12" fill="#F0DCC2" />
    <rect x="0" y="${WALL_BOTTOM - 12}" width="${DESIGN_WIDTH}" height="3" fill="#FFFFFF" opacity="0.55" />
  `;
}

function floorBody(): string {
  const height = FLOOR_BOTTOM - FLOOR_TOP;
  const planks: string[] = [];
  for (let y = FLOOR_TOP + 30; y < FLOOR_BOTTOM; y += 30) {
    planks.push(`<rect x="0" y="${y}" width="${DESIGN_WIDTH}" height="1.6" fill="#E4C29C" opacity="0.6" />`);
  }
  let row = 0;
  for (let y = FLOOR_TOP + 30; y < FLOOR_BOTTOM; y += 30) {
    const offset = (row % 2 === 0 ? 40 : 110) + (row % 3) * 24;
    for (let x = offset; x < DESIGN_WIDTH; x += 132) {
      planks.push(`<rect x="${x}" y="${y - 30}" width="1.4" height="30" fill="#E4C29C" opacity="0.35" />`);
    }
    row += 1;
  }
  return `
    <rect y="${FLOOR_TOP}" width="${DESIGN_WIDTH}" height="${height}" fill="url(#floor)" />
    ${planks.join('')}
    <!-- tile strip along the kitchen wall (subtle hint of the cooking area) -->
    ${Array.from({ length: 9 }, (_, index) => {
      const x = PLAN.left + index * PLAN.cellW;
      return `<rect x="${x}" y="${WALL_BOTTOM - 30}" width="${PLAN.cellW}" height="18" fill="#E7F2F6" opacity="0.8" />`;
    }).join('')}
  `;
}

/** Full background: wall band on top, floor plan below. */
export function roomBackgroundSvg(): string {
  return svg(`${wallBody()}${floorBody()}`);
}

/** Only the wall band (useful for previews of wall art). */
export function roomWallSvg(): string {
  return svg(wallBody(), DESIGN_WIDTH, WALL_BOTTOM);
}

/** Only the floor (2D plan used by the house preview and the minimap). */
export function floorPlanSvg(): string {
  const cells = Array.from({ length: ROOM_CELLS.rows }, (_, y) =>
    Array.from({ length: ROOM_CELLS.cols }, (_, x) => {
      const color = (x + y) % 2 === 0 ? '#F7E6CF' : '#F2DCC0';
      const left = PLAN.left + x * PLAN.cellW;
      const top = FLOOR_TOP + (y * (FLOOR_BOTTOM - FLOOR_TOP)) / ROOM_CELLS.rows;
      const cellHeight = (FLOOR_BOTTOM - FLOOR_TOP) / ROOM_CELLS.rows;
      return `<rect x="${left}" y="${top}" width="${PLAN.cellW}" height="${cellHeight}" fill="${color}" />`;
    }).join(''),
  ).join('');
  return svg(cells);
}
