/**
 * Procedural furniture art (SVG strings).
 *
 * Why SVG instead of PNG sprites:
 *  - zero binary assets to download (the whole room is a few KB of paths);
 *  - crisp on every DPR, no 1x/2x/3x atlas to maintain;
 *  - colors come from a palette, so a night variant or an event skin is a
 *    parameter change instead of a new asset pack.
 * Every item is drawn so that its **bottom center** is the anchor point, which
 * makes placing it on the floor trivial (and lets us add the soft shadow in one
 * place, in the scene).
 */
import { ART } from './palette';

const svg = (w: number, h: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`;

/* -------------------------------------------------------------------------- */
/*                                  BED                                       */
/* -------------------------------------------------------------------------- */

export function bedSvg(blanket = ART.mint, blanketDark = ART.mintDark): string {
  return svg(
    120,
    84,
    `
    <rect x="4" y="30" width="112" height="50" rx="9" fill="${ART.woodLight}" />
    <rect x="4" y="30" width="112" height="8" rx="4" fill="${ART.wood}" opacity="0.7" />
    <!-- headboard -->
    <rect x="0" y="6" width="120" height="30" rx="12" fill="${ART.wood}" />
    <rect x="4" y="10" width="112" height="22" rx="9" fill="${ART.woodLight}" />
    <!-- mattress -->
    <rect x="6" y="18" width="108" height="20" rx="8" fill="${ART.white}" />
    <!-- pillows -->
    <rect x="14" y="14" width="38" height="18" rx="8" fill="${ART.cream}" />
    <rect x="68" y="14" width="38" height="18" rx="8" fill="#FFF2E2" />
    <!-- blanket -->
    <path d="M4 40h112v28a10 10 0 0 1-10 10H14a10 10 0 0 1-10-10V40Z" fill="${blanket}" />
    <path d="M4 40h112v7H4z" fill="${blanketDark}" opacity="0.55" />
    <path d="M8 52h104" stroke="${blanketDark}" stroke-width="2" stroke-linecap="round" opacity="0.35" />
    <path d="M8 62h104" stroke="${blanketDark}" stroke-width="2" stroke-linecap="round" opacity="0.22" />
    <!-- feet -->
    <rect x="10" y="78" width="12" height="6" rx="3" fill="${ART.woodDark}" />
    <rect x="98" y="78" width="12" height="6" rx="3" fill="${ART.woodDark}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SOFA                                      */
/* -------------------------------------------------------------------------- */

export function sofaSvg(base = ART.mint, baseDark = ART.mintDark): string {
  return svg(
    104,
    76,
    `
    <rect x="2" y="22" width="100" height="42" rx="14" fill="${baseDark}" />
    <rect x="6" y="4" width="92" height="40" rx="14" fill="${base}" />
    <path d="M6 30h92" stroke="${baseDark}" stroke-width="2" opacity="0.4" />
    <!-- seat -->
    <rect x="4" y="34" width="96" height="26" rx="11" fill="${base}" />
    <rect x="28" y="34" width="48" height="26" rx="8" fill="${base}" opacity="0.55" />
    <!-- arms -->
    <rect x="0" y="26" width="16" height="40" rx="8" fill="${baseDark}" />
    <rect x="88" y="26" width="16" height="40" rx="8" fill="${baseDark}" />
    <!-- pillow on the seat -->
    <rect x="22" y="42" width="18" height="15" rx="6" transform="rotate(-10 31 49)" fill="${ART.coral}" />
    <rect x="26" y="46" width="10" height="7" rx="3" transform="rotate(-10 31 49)" fill="${ART.coralDark}" opacity="0.25" />
    <!-- legs -->
    <rect x="10" y="64" width="10" height="10" rx="4" fill="${ART.woodDark}" />
    <rect x="84" y="64" width="10" height="10" rx="4" fill="${ART.woodDark}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                               BOOKSHELF                                    */
/* -------------------------------------------------------------------------- */

export function bookshelfSvg(): string {
  const books = [
    [7, 52, 6, 16, ART.coral],
    [14, 48, 7, 20, ART.sun],
    [22, 54, 5, 14, ART.lilac],
    [28, 50, 8, 18, ART.sky],
    [7, 86, 7, 18, ART.mint],
    [15, 82, 6, 22, ART.coralDark],
    [22, 88, 8, 16, ART.lilacDark],
    [31, 84, 6, 20, ART.sunDark],
  ]
    .map(
      ([x, y, w, h, fill]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" />`,
    )
    .join('');
  return svg(
    44,
    112,
    `
    <ellipse cx="22" cy="109" rx="20" ry="3" fill="${ART.woodDark}" opacity="0.35" />
    <rect x="0" y="0" width="44" height="110" rx="6" fill="${ART.wood}" />
    <rect x="3" y="3" width="38" height="104" rx="4" fill="#F3DEC2" />
    <rect x="3" y="36" width="38" height="5" fill="${ART.wood}" />
    <rect x="3" y="72" width="38" height="5" fill="${ART.wood}" />
    ${books}
    <rect x="30" y="16" width="7" height="16" rx="2" fill="${ART.mint}" />
    <rect x="22" y="20" width="7" height="12" rx="2" fill="${ART.sun}" />
    <rect x="11" y="62" width="11" height="10" rx="3" fill="${ART.white}" />
    <circle cx="16.5" cy="67" r="3" fill="${ART.leaf}" />
    <rect x="8" y="98" width="26" height="9" rx="3" fill="${ART.pink}" opacity="0.85" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  FRIDGE                                    */
/* -------------------------------------------------------------------------- */

export function fridgeSvg(): string {
  return svg(
    56,
    128,
    `
    <ellipse cx="28" cy="124" rx="25" ry="3.4" fill="${ART.metalDark}" opacity="0.3" />
    <rect x="2" y="2" width="52" height="120" rx="10" fill="${ART.white}" />
    <rect x="2" y="2" width="52" height="120" rx="10" fill="${ART.metal}" opacity="0.35" />
    <rect x="32" y="2" width="22" height="120" rx="10" fill="${ART.metal}" opacity="0.28" />
    <path d="M2 34h52" stroke="${ART.metalDark}" stroke-width="2.4" />
    <rect x="41" y="10" width="4" height="16" rx="2" fill="${ART.metalDark}" />
    <rect x="41" y="42" width="4" height="26" rx="2" fill="${ART.metalDark}" />
    <circle cx="18" cy="18" r="4" fill="${ART.coral}" />
    <rect x="12" y="54" width="16" height="12" rx="2" fill="${ART.sun}" opacity="0.9" />
    <path d="M14 60h12" stroke="${ART.white}" stroke-width="1.6" />
    <rect x="2" y="118" width="8" height="6" rx="2" fill="${ART.metalDark}" />
    <rect x="46" y="118" width="8" height="6" rx="2" fill="${ART.metalDark}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                              KITCHEN COUNTER                               */
/* -------------------------------------------------------------------------- */

export function counterSvg(): string {
  // Real tile grid (5x2 small tiles) + warm wood cabinets. This is the piece the
  // player will interact with most in Phase 1 ("cozinhar"), so it must read as a
  // kitchen even at 1/3 size.
  const tiles = Array.from({ length: 10 }, (_, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    return `<rect x="${6 + col * 23}" y="${2 + row * 11}" width="20" height="8" rx="2" fill="#FFFFFF" opacity="0.9" />`;
  }).join('');
  return svg(
    124,
    84,
    `
    <ellipse cx="62" cy="81" rx="56" ry="3.4" fill="${ART.woodDark}" opacity="0.22" />
    <!-- tiled backsplash -->
    <rect x="2" y="0" width="120" height="24" rx="6" fill="#E7F2F6" />
    ${tiles}
    <!-- upper cabinet -->
    <rect x="84" y="0" width="36" height="22" rx="4" fill="${ART.wood}" />
    <rect x="87" y="3" width="30" height="16" rx="3" fill="${ART.woodLight}" />
    <!-- wood cabinet base -->
    <rect x="2" y="30" width="120" height="50" rx="7" fill="${ART.wood}" />
    <rect x="6" y="36" width="52" height="38" rx="4" fill="${ART.woodLight}" />
    <rect x="62" y="36" width="54" height="38" rx="4" fill="${ART.woodLight}" />
    <rect x="50" y="52" width="10" height="3.5" rx="1.75" fill="${ART.woodDark}" />
    <rect x="66" y="52" width="10" height="3.5" rx="1.75" fill="${ART.woodDark}" />
    <rect x="16" y="46" width="30" height="22" rx="4" fill="${ART.cream}" opacity="0.5" />
    <!-- countertop -->
    <rect x="0" y="24" width="124" height="9" rx="4" fill="${ART.white}" />
    <rect x="0" y="31" width="124" height="3" rx="1.5" fill="${ART.metalDark}" opacity="0.35" />
    <!-- sink -->
    <rect x="12" y="25" width="32" height="7" rx="3" fill="${ART.metal}" />
    <path d="M28 24v-9c0-3 2-5 5-5h6" stroke="${ART.metalDark}" stroke-width="2.4" stroke-linecap="round" fill="none" />
    <!-- stove burners -->
    <circle cx="70" cy="28" r="5" fill="${ART.metalDark}" opacity="0.55" />
    <circle cx="84" cy="28" r="5" fill="${ART.metalDark}" opacity="0.35" />
    <!-- kettle + jar -->
    <rect x="98" y="16" width="14" height="11" rx="4.5" fill="${ART.coral}" />
    <rect x="101" y="12" width="8" height="5" rx="2" fill="${ART.coralDark}" />
    <rect x="60" y="12" width="10" height="13" rx="3.5" fill="${ART.mint}" opacity="0.9" />
    <rect x="62" y="9" width="6" height="4" rx="2" fill="${ART.wood}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                   PLANT                                    */
/* -------------------------------------------------------------------------- */

export function plantSvg(): string {
  return svg(
    42,
    92,
    `
    <ellipse cx="21" cy="89" rx="17" ry="3" fill="${ART.woodDark}" opacity="0.25" />
    <path d="M21 52C10 44 6 30 10 18c10 2 17 12 17 24" fill="${ART.leaf}" />
    <path d="M21 52c11-8 15-22 11-34-10 2-17 12-17 24" fill="${ART.leafDark}" />
    <path d="M21 56c0-14 0-26 0-34" stroke="${ART.leafDark}" stroke-width="2" stroke-linecap="round" />
    <path d="M21 40C13 34 10 24 12 16" stroke="${ART.leafLight}" stroke-width="2" stroke-linecap="round" />
    <path d="M12 62h18l-3 24a4 4 0 0 1-4 3h-4a4 4 0 0 1-4-3l-3-24Z" fill="${ART.coral}" />
    <rect x="9" y="58" width="24" height="7" rx="3.5" fill="${ART.coralDark}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                    RUG                                     */
/* -------------------------------------------------------------------------- */

export function rugSvg(): string {
  return svg(
    210,
    66,
    `
    <ellipse cx="105" cy="33" rx="104" ry="31" fill="${ART.rugAlt}" />
    <ellipse cx="105" cy="32" rx="96" ry="27" fill="${ART.rug}" />
    <ellipse cx="105" cy="32" rx="70" ry="19" fill="${ART.rugCream}" opacity="0.92" />
    <ellipse cx="105" cy="32" rx="44" ry="11" fill="${ART.rugAlt}" opacity="0.55" />
    <ellipse cx="105" cy="32" rx="18" ry="5" fill="${ART.rugCream}" opacity="0.9" />
    <path d="M4 32h16M190 32h16" stroke="${ART.rugCream}" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  `,
  );
}

export function coffeeTableSvg(): string {
  return svg(
    96,
    46,
    `
    <ellipse cx="48" cy="43" rx="42" ry="3" fill="${ART.woodDark}" opacity="0.24" />
    <rect x="4" y="12" width="88" height="12" rx="6" fill="${ART.woodLight}" />
    <rect x="4" y="12" width="88" height="5" rx="2.5" fill="${ART.white}" opacity="0.35" />
    <rect x="12" y="24" width="6" height="18" rx="3" fill="${ART.woodDark}" />
    <rect x="78" y="24" width="6" height="18" rx="3" fill="${ART.woodDark}" />
    <!-- mug -->
    <rect x="58" y="2" width="14" height="12" rx="4" fill="${ART.white}" />
    <path d="M72 6h4a3 3 0 0 1 0 6h-4" stroke="${ART.white}" stroke-width="2.6" />
    <ellipse cx="65" cy="3" rx="7" ry="2" fill="${ART.coral}" opacity="0.75" />
    <!-- book -->
    <rect x="22" y="4" width="26" height="9" rx="2.5" fill="${ART.lilac}" />
    <rect x="24" y="6" width="22" height="3" rx="1.5" fill="${ART.white}" opacity="0.8" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  CAT BED                                   */
/* -------------------------------------------------------------------------- */

export function catBedSvg(): string {
  return svg(
    78,
    34,
    `
    <ellipse cx="39" cy="31" rx="34" ry="3" fill="${ART.woodDark}" opacity="0.2" />
    <ellipse cx="39" cy="18" rx="37" ry="14" fill="${ART.sun}" />
    <ellipse cx="39" cy="16" rx="28" ry="9" fill="${ART.sunDark}" opacity="0.55" />
    <ellipse cx="39" cy="15" rx="24" ry="7" fill="${ART.cream}" />
    <path d="M2 18a37 12 0 0 0 74 0" stroke="${ART.sunDark}" stroke-width="3" stroke-linecap="round" opacity="0.6" />
  `,
  );
}

/** Sleeping curled cat. Anchored bottom center; the scene adds the "Zzz". */
export function catSvg(): string {
  return svg(
    72,
    40,
    `
    <ellipse cx="36" cy="37" rx="30" ry="2.6" fill="${ART.catDark}" opacity="0.2" />
    <path d="M6 30c0-12 13-20 30-20s26 8 26 18c0 4-3 7-8 7H12c-4 0-6-2-6-5Z" fill="${ART.catFur}" />
    <path d="M14 32c2-8 10-13 20-13s16 4 19 11" fill="${ART.catFurLight}" opacity="0.7" />
    <circle cx="54" cy="18" r="13" fill="${ART.catFur}" />
    <path d="M44 8l2-6 6 4" fill="${ART.catFur}" />
    <path d="M62 7l3-5 4 7" fill="${ART.catFur}" />
    <path d="M45 8l1.2-4 3.6 2.4" fill="${ART.catFurLight}" />
    <path d="M63 7l1.8-3.4 2.6 4.6" fill="${ART.catFurLight}" />
    <path d="M48 18q2.6 2.4 5.2 0" stroke="${ART.ink}" stroke-width="1.8" stroke-linecap="round" />
    <path d="M57 18q2.6 2.4 5.2 0" stroke="${ART.ink}" stroke-width="1.8" stroke-linecap="round" />
    <path d="M54.6 22.6h1.4l-0.7 1.6" fill="${ART.catDark}" />
    <path d="M43 22h-6M43 24.5h-6M66 22h6M66 24.5h6" stroke="${ART.catDark}" stroke-width="1" opacity="0.7" />
    <path d="M8 28c-4-2-6-6-4-9" stroke="${ART.catDark}" stroke-width="4" stroke-linecap="round" />
    <path d="M20 12c4-2 8-1 10 1" stroke="${ART.catDark}" stroke-width="2.6" stroke-linecap="round" opacity="0.7" />
  `,
  );
}


/* -------------------------------------------------------------------------- */
/*                                  STOVE                                     */
/* -------------------------------------------------------------------------- */

/** Kitchen stove: four burners, oven glass and a pot. Anchored bottom center. */
export function stoveSvg(): string {
  return svg(
    96,
    92,
    `
    <ellipse cx="48" cy="89" rx="42" ry="3.2" fill="${ART.woodDark}" opacity="0.24" />
    <!-- cabinet body -->
    <rect x="4" y="30" width="88" height="56" rx="7" fill="${ART.wood}" />
    <rect x="8" y="36" width="80" height="24" rx="4" fill="${ART.woodLight}" />
    <rect x="8" y="64" width="80" height="18" rx="4" fill="${ART.woodLight}" />
    <rect x="38" y="47" width="20" height="3.4" rx="1.7" fill="${ART.woodDark}" />
    <rect x="38" y="72" width="20" height="3.4" rx="1.7" fill="${ART.woodDark}" />
    <!-- oven glass -->
    <rect x="12" y="38" width="72" height="20" rx="4" fill="${ART.screen}" opacity="0.75" />
    <rect x="14" y="40" width="68" height="7" rx="3" fill="${ART.screenGlow}" opacity="0.35" />
    <!-- countertop -->
    <rect x="0" y="22" width="96" height="10" rx="4" fill="${ART.white}" />
    <rect x="0" y="29" width="96" height="3" rx="1.5" fill="${ART.metalDark}" opacity="0.35" />
    <!-- burners -->
    <circle cx="26" cy="27" r="8" fill="${ART.metalDark}" opacity="0.5" />
    <circle cx="52" cy="27" r="8" fill="${ART.metalDark}" opacity="0.35" />
    <circle cx="78" cy="27" r="6" fill="${ART.metalDark}" opacity="0.35" />
    <circle cx="26" cy="27" r="4" fill="${ART.metal}" opacity="0.8" />
    <!-- pot with lid -->
    <rect x="16" y="12" width="22" height="14" rx="4" fill="${ART.coral}" />
    <rect x="14" y="9" width="26" height="5" rx="2.5" fill="${ART.coralDark}" />
    <circle cx="27" cy="8" r="2" fill="${ART.coralDark}" />
    <path d="M16 16h-4M38 16h4" stroke="${ART.coralDark}" stroke-width="2.4" stroke-linecap="round" />
    <!-- steam -->
    <path d="M24 6c2-3 0-5 2-8M32 5c-2-3 0-5-2-7" stroke="${ART.white}" stroke-width="2" stroke-linecap="round" opacity="0.75" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                   SINK                                     */
/* -------------------------------------------------------------------------- */

/** Small utility sink with a towel. Anchored bottom center. */
export function sinkSvg(): string {
  return svg(
    66,
    96,
    `
    <ellipse cx="33" cy="93" rx="28" ry="3" fill="${ART.woodDark}" opacity="0.22" />
    <!-- pedestal -->
    <path d="M22 52h22l4 38a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6l4-38Z" fill="${ART.white}" />
    <rect x="20" y="60" width="26" height="4" rx="2" fill="${ART.metal}" opacity="0.6" />
    <!-- basin -->
    <path d="M4 30h58v10c0 10-13 16-29 16S4 50 4 40V30Z" fill="${ART.white}" />
    <ellipse cx="33" cy="31" rx="29" ry="8" fill="${ART.metal}" opacity="0.35" />
    <ellipse cx="33" cy="31" rx="23" ry="5.4" fill="${ART.glass}" />
    <!-- faucet -->
    <path d="M33 28V14c0-4 3-7 7-7h4" stroke="${ART.metalDark}" stroke-width="3.4" stroke-linecap="round" fill="none" />
    <rect x="43" y="5" width="4" height="7" rx="1.6" fill="${ART.metalDark}" />
    <circle cx="33" cy="15" r="2.6" fill="${ART.metalDark}" />
    <!-- water drop -->
    <path d="M45 16c1.6 2 2.4 3.4 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.6 2.4-4.6Z" fill="${ART.sky}" opacity="0.85" />
    <!-- towel -->
    <rect x="2" y="40" width="10" height="22" rx="3" fill="${ART.mint}" />
    <rect x="2" y="40" width="10" height="4" rx="2" fill="${ART.mintDark}" />
    <!-- soap -->
    <rect x="48" y="28" width="10" height="6" rx="2.4" fill="${ART.sun}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  TOILET                                    */
/* -------------------------------------------------------------------------- */

/** Toilet with lid and a paper roll. Anchored bottom center. */
export function toiletSvg(): string {
  return svg(
    52,
    78,
    `
    <ellipse cx="26" cy="75" rx="20" ry="2.6" fill="${ART.woodDark}" opacity="0.22" />
    <!-- tank -->
    <rect x="6" y="2" width="40" height="22" rx="6" fill="${ART.white}" />
    <rect x="10" y="6" width="32" height="14" rx="4" fill="${ART.metal}" opacity="0.25" />
    <circle cx="26" cy="13" r="3" fill="${ART.metalDark}" opacity="0.7" />
    <!-- base -->
    <path d="M14 40h24l3 32a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5l3-32Z" fill="${ART.white}" />
    <path d="M18 46h16" stroke="${ART.metal}" stroke-width="2" opacity="0.6" />
    <!-- seat and lid -->
    <ellipse cx="26" cy="36" rx="22" ry="9" fill="${ART.white}" />
    <ellipse cx="26" cy="33" rx="18" ry="7" fill="${ART.metal}" opacity="0.22" />
    <ellipse cx="26" cy="32.5" rx="13" ry="4.6" fill="${ART.cream}" />
    <path d="M6 36c0 5 9 9 20 9s20-4 20-9" stroke="${ART.metal}" stroke-width="2" fill="none" opacity="0.5" />
    <!-- paper roll -->
    <rect x="44" y="28" width="7" height="12" rx="3.4" fill="${ART.white}" />
    <circle cx="47.5" cy="34" r="1.4" fill="${ART.metalDark}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SHOWER                                    */
/* -------------------------------------------------------------------------- */

/**
 * Shower: tiled wall panel, glass door, shower head and a small bottle shelf.
 * Rendered on top of the "shower glass" glow in the scene.
 */
export function showerSvg(): string {
  const tiles = Array.from({ length: 12 }, (_, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return `<rect x="${4 + col * 17}" y="${6 + row * 16}" width="15" height="14" rx="2.5" fill="#FFFFFF" opacity="0.55" />`;
  }).join('');
  return svg(
    74,
    134,
    `
    <ellipse cx="37" cy="131" rx="30" ry="3" fill="${ART.metalDark}" opacity="0.2" />
    <!-- tiled back panel -->
    <rect x="0" y="2" width="70" height="126" rx="8" fill="#DDEEF4" />
    ${tiles}
    <!-- shower column -->
    <rect x="56" y="20" width="4" height="76" rx="2" fill="${ART.metalDark}" />
    <path d="M36 20h22" stroke="${ART.metalDark}" stroke-width="3.4" stroke-linecap="round" />
    <path d="M36 20c-4 0-7 3-7 7v4" stroke="${ART.metal}" stroke-width="3" stroke-linecap="round" fill="none" />
    <ellipse cx="29" cy="32" rx="9" ry="4" fill="${ART.metal}" />
    <ellipse cx="29" cy="33" rx="6" ry="2.4" fill="${ART.metalDark}" opacity="0.6" />
    <!-- water -->
    <path d="M23 38c-1 18 1 30 1 40M29 38c0 20 0 32 0 42M35 38c1 18-1 30-1 40" stroke="${ART.sky}" stroke-width="2.4" stroke-linecap="round" opacity="0.7" />
    <!-- glass door -->
    <rect x="44" y="8" width="26" height="116" rx="8" fill="${ART.glass}" />
    <rect x="46" y="10" width="22" height="112" rx="7" fill="none" stroke="${ART.glassEdge}" stroke-width="2.4" />
    <circle cx="51" cy="66" r="2.2" fill="${ART.metalDark}" />
    <!-- shelf + bottles -->
    <rect x="4" y="92" width="30" height="4" rx="2" fill="${ART.woodLight}" />
    <rect x="8" y="80" width="8" height="12" rx="3" fill="${ART.coral}" />
    <rect x="18" y="84" width="7" height="8" rx="2.6" fill="${ART.mint}" />
    <!-- drain -->
    <ellipse cx="28" cy="124" rx="12" ry="3.4" fill="${ART.metal}" opacity="0.7" />
  `,
  );
}

/** Soft warm glow sprite used by the shower when running (animated). */
export function showerSteamSvg(size = 120): string {
  return svg(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="#FFFFFF" opacity="0.55" />`,
  );
}


/** Slim floor lamp with a warm shade. Anchor bottom center. */
export function floorLampSvg(): string {
  return svg(
    46,
    118,
    `
    <ellipse cx="23" cy="115" rx="14" ry="2.6" fill="${ART.woodDark}" opacity="0.25" />
    <ellipse cx="23" cy="111" rx="12" ry="4" fill="${ART.woodDark}" />
    <rect x="21.4" y="30" width="3.2" height="80" rx="1.6" fill="${ART.wood}" />
    <path d="M9 30h28l-3 -22c-.4 -3 -2.6 -5 -5.6 -5h-10.8c-3 0 -5.2 2 -5.6 5l-3 22Z" fill="${ART.sun}" />
    <path d="M9 30h28l-1.4 -10H10.4L9 30Z" fill="${ART.sunDark}" opacity="0.5" />
    <rect x="8" y="28" width="30" height="4" rx="2" fill="${ART.sunDark}" opacity="0.7" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                              WALL DECORATION                               */
/* -------------------------------------------------------------------------- */

export function paintingSvg(): string {
  return svg(
    72,
    56,
    `
    <rect x="0" y="0" width="72" height="56" rx="5" fill="${ART.wood}" />
    <rect x="5" y="5" width="62" height="46" rx="3" fill="${ART.cream}" />
    <path d="M5 36l16-14 12 10 10-8 19 16v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V36Z" fill="${ART.sky}" opacity="0.85" />
    <circle cx="50" cy="18" r="7" fill="${ART.sun}" />
    <path d="M5 46h62" stroke="${ART.mint}" stroke-width="0" />
  `,
  );
}

export function clockSvg(): string {
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 30 * Math.PI) / 180;
    const x1 = 24 + Math.sin(angle) * 17;
    const y1 = 24 - Math.cos(angle) * 17;
    const x2 = 24 + Math.sin(angle) * 19.5;
    const y2 = 24 - Math.cos(angle) * 19.5;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${ART.inkSoft}" stroke-width="1.2" stroke-linecap="round" />`;
  }).join('');
  return svg(
    48,
    48,
    `
    <circle cx="24" cy="24" r="23" fill="${ART.coral}" />
    <circle cx="24" cy="24" r="19.5" fill="${ART.cream}" />
    ${ticks}
    <path d="M24 24v-7.5" stroke="${ART.ink}" stroke-width="2.2" stroke-linecap="round" />
    <path d="M24 24l5.5 3.5" stroke="${ART.ink}" stroke-width="1.8" stroke-linecap="round" />
    <circle cx="24" cy="24" r="2.2" fill="${ART.ink}" />
  `,
  );
}

/**
 * Window frame drawn *around* a transparent glass area, so the sky texture
 * behind it (tinted by the time of day) shows through.
 */
export function windowFrameSvg(w = 180, h = 132): string {
  const frame = 9;
  return svg(
    w,
    h,
    `
    <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="none" stroke="${ART.windowFrame}" stroke-width="${frame}" />
    <rect x="${frame / 2}" y="${frame / 2}" width="${w - frame}" height="${h - frame}" rx="6" fill="none" stroke="${ART.wallTrim}" stroke-width="1.6" opacity="0.7" />
    <path d="M${w / 2} ${frame / 2}v${h - frame}M${frame / 2} ${(h / 2) | 0}h${w - frame}" stroke="${ART.windowFrame}" stroke-width="6" />
    <rect x="0" y="${h - 4}" width="${w}" height="12" rx="5" fill="${ART.white}" />
    <path d="M2 ${h - 3}h${w - 4}" stroke="${ART.wallTrim}" stroke-width="1.4" opacity="0.55" />
  `,
  );
}

export function curtainsSvg(w = 180, h = 128): string {
  const panel = (mirror: boolean) => {
    const transform = mirror ? `transform="translate(${w} 0) scale(-1 1)"` : '';
    return `<g ${transform}>
      <path d="M2 4h30c-2 30-6 62-2 96 1 10-6 16-14 14C7 112 2 108 2 100V4Z" fill="${ART.coral}" opacity="0.55" />
      <path d="M10 6c-1 30-4 62-1 92" stroke="${ART.coralDark}" stroke-width="2" opacity="0.3" stroke-linecap="round" />
      <path d="M20 6c-1 28-3 58-1 86" stroke="${ART.coralDark}" stroke-width="1.6" opacity="0.2" stroke-linecap="round" />
      <path d="M2 4h30v6H2z" fill="${ART.coralDark}" opacity="0.25" />
    </g>`;
  };
  return svg(
    w,
    h,
    `
    <path d="M0 6h${w}" stroke="${ART.woodDark}" stroke-width="4.5" stroke-linecap="round" />
    <circle cx="1" cy="6" r="4" fill="${ART.woodDark}" />
    <circle cx="${w - 1}" cy="6" r="4" fill="${ART.woodDark}" />
    ${panel(false)}
    ${panel(true)}
  `,
  );
}

/** Minimal wall shelf: one plank + three tiny objects. */
export function wallShelfSvg(): string {
  return svg(
    96,
    34,
    `
    <rect x="0" y="24" width="96" height="6" rx="3" fill="${ART.wood}" />
    <rect x="6" y="10" width="10" height="14" rx="2" fill="${ART.coral}" />
    <rect x="18" y="6" width="8" height="18" rx="2" fill="${ART.sky}" />
    <rect x="28" y="12" width="12" height="12" rx="2" fill="${ART.sun}" />
    <rect x="48" y="12" width="14" height="12" rx="6" fill="${ART.cream}" />
    <path d="M55 12V6" stroke="${ART.leaf}" stroke-width="2.4" stroke-linecap="round" />
    <rect x="70" y="16" width="16" height="8" rx="3" fill="${ART.lilac}" />
  `,
  );
}

/* -------------------------------------------------------------------------- */
/*                              SMALL TEXTURES                                */
/* -------------------------------------------------------------------------- */

/** Soft radial light used for lamps, sun rays and window glow. */
export function glowSvg(size = 256): string {
  return svg(
    size,
    size,
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)" />`,
  );
}

/** Window sky: a light gradient that Phaser tints with the time-of-day color. */
/**
 * Sky seen through the window. Kept mostly white/blue so the scene can tint it
 * (dawn/noon/dusk/night) without the landscape turning muddy.
 */
export function skySvg(w = 180, h = 132): string {
  return svg(
    w,
    h,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#BFE0F2" />
      <stop offset="55%" stop-color="#E8F4FA" />
      <stop offset="100%" stop-color="#FFFDF6" />
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#s)" />
    <circle cx="${w * 0.74}" cy="${h * 0.3}" r="${h * 0.13}" fill="#FFE9A8" />
    <path d="M0 ${h * 0.78}q${w * 0.22} -${h * 0.2} ${w * 0.48} ${h * 0.02}q${w * 0.24} ${h * 0.16} ${w * 0.34} -${h * 0.03}V${h}H0Z" fill="#CFE7CF" opacity="0.9" />
    <path d="M0 ${h * 0.9}q${w * 0.3} -${h * 0.12} ${w * 0.62} ${h * 0.02}q${w * 0.2} ${h * 0.1} ${w * 0.4} 0V${h}H0Z" fill="#B9DBB9" opacity="0.85" />
    <circle cx="${w * 0.2}" cy="${h * 0.26}" r="${h * 0.16}" fill="#FFFFFF" opacity="0.75" />
    <circle cx="${w * 0.3}" cy="${h * 0.22}" r="${h * 0.2}" fill="#FFFFFF" opacity="0.75" />`,
  );
}

export function moonSvg(size = 44): string {
  return svg(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#FFF6D8" />
     <circle cx="${size / 2 - 6}" cy="${size / 2 - 4}" r="5" fill="#EFE0BC" opacity="0.75" />
     <circle cx="${size / 2 + 6}" cy="${size / 2 + 6}" r="3.4" fill="#EFE0BC" opacity="0.6" />`,
  );
}

export function sunSvg(size = 48): string {
  return svg(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="#FFE9A8" />
     <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 10}" fill="#FFF6D0" />`,
  );
}

export function starSvg(size = 10): string {
  return svg(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF" />`,
  );
}

export function dustSvg(size = 12): string {
  return svg(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#FFFFFF" />`,
  );
}

/**
 * Catalog used by the scene: texture key, generator and the item's design size
 * (the size in "design pixels" the layout engine uses).
 */
export interface FurnitureSpec {
  key: string;
  svg: () => string;
  w: number;
  h: number;
  /** Soft shadow width multiplier (1 = as wide as the item). */
  shadow?: number;
  /** Show a floating name label when tapped. */
  labelKey: string;
  /** Slight idle animation hint, handled by the scene. */
  anim?: 'sway' | 'flicker' | 'none';
}

export const FURNITURE: readonly FurnitureSpec[] = [
  { key: 'bed', svg: () => bedSvg(), w: 120, h: 84, shadow: 1.05, labelKey: 'items.bed', anim: 'none' },
  { key: 'sofa', svg: () => sofaSvg(), w: 104, h: 76, shadow: 1.1, labelKey: 'items.sofa', anim: 'none' },
  { key: 'bookshelf', svg: () => bookshelfSvg(), w: 44, h: 112, shadow: 0.9, labelKey: 'items.bookshelf', anim: 'none' },
  { key: 'fridge', svg: () => fridgeSvg(), w: 56, h: 128, shadow: 0.9, labelKey: 'items.fridge', anim: 'none' },
  { key: 'counter', svg: () => counterSvg(), w: 124, h: 84, shadow: 1, labelKey: 'items.counter', anim: 'none' },
  { key: 'plant', svg: () => plantSvg(), w: 42, h: 92, shadow: 0.8, labelKey: 'items.plant', anim: 'sway' },
  { key: 'rug', svg: () => rugSvg(), w: 210, h: 66, labelKey: 'items.rug', anim: 'none' },
  { key: 'coffeeTable', svg: () => coffeeTableSvg(), w: 96, h: 46, shadow: 1, labelKey: 'items.coffeeTable', anim: 'none' },
  { key: 'catBed', svg: () => catBedSvg(), w: 78, h: 34, shadow: 1, labelKey: 'items.catBed', anim: 'none' },
  { key: 'cat', svg: () => catSvg(), w: 72, h: 40, shadow: 0.9, labelKey: 'items.cat', anim: 'none' },
  { key: 'painting', svg: () => paintingSvg(), w: 72, h: 56, labelKey: 'items.painting', anim: 'none' },
  { key: 'clock', svg: () => clockSvg(), w: 48, h: 48, labelKey: 'items.clock', anim: 'none' },
  { key: 'wallShelf', svg: () => wallShelfSvg(), w: 96, h: 34, labelKey: 'items.shelf', anim: 'none' },
  { key: 'stove', svg: () => stoveSvg(), w: 96, h: 92, shadow: 1, labelKey: 'items.stove', anim: 'none' },
  { key: 'sink', svg: () => sinkSvg(), w: 66, h: 96, shadow: 0.85, labelKey: 'items.sink', anim: 'none' },
  { key: 'toilet', svg: () => toiletSvg(), w: 52, h: 78, shadow: 0.9, labelKey: 'items.toilet', anim: 'none' },
  { key: 'shower', svg: () => showerSvg(), w: 74, h: 134, shadow: 0.9, labelKey: 'items.shower', anim: 'none' },
  // The catalog item is `lamp` and its texture key is `room-lamp`, so the spec
  // key must match the item id even though the drawing function is `floorLampSvg`.
  { key: 'lamp', svg: () => floorLampSvg(), w: 46, h: 118, shadow: 0.8, labelKey: 'items.lamp', anim: 'none' },
] as const;

export const TEXTURES = {
  windowFrame: () => windowFrameSvg(),
  curtains: () => curtainsSvg(),
  glow: () => glowSvg(),
  sky: () => skySvg(),
  moon: () => moonSvg(),
  sun: () => sunSvg(),
  star: () => starSvg(),
  dust: () => dustSvg(),
  steam: () => showerSteamSvg(),
} as const;
