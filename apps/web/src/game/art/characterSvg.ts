/**
 * Procedural character art.
 *
 * The character is a cute "chibi" drawn as an SVG string. One function feeds
 * both sides of the app:
 *  - React uses it as a portrait (<img src={dataUri}>) in the HUD and menus;
 *  - Phaser converts it into a texture for the room.
 * Having a single source means the avatar in the HUD always matches the sprite
 * walking around the house, including hair, face, clothes and accessories.
 *
 * Every appearance category (eyes, brows, nose, mouth, accessory…) is a small
 * switch that returns SVG. Adding an option is: add the id to `shared/character`
 * and add a case here.
 */
import {
  resolveEye,
  resolveHairColor,
  resolveOutfitColor,
  resolveSkinColor,
  type Appearance,
} from '@vida/shared';

export type CharacterMode = 'full' | 'bust';
export type CharacterMood = 'happy' | 'neutral' | 'sleepy';
/** Extra "action" poses used by the interaction animations. */
export type CharacterPose = 'idle' | 'walk' | 'sit' | 'sleep';

export interface CharacterSvgOptions {
  mode?: CharacterMode;
  mood?: CharacterMood;
  /** Vertical breathing offset in svg units (0..2). */
  breath?: number;
  /** Draw eyes closed (blink frame). */
  blink?: boolean;
  /** Outline color used for subtle separation from the background. */
  outline?: string;
  /** Idle, walking (legs apart) or sitting (legs forward). */
  pose?: CharacterPose;
  /** Horizontal step offset in svg units for the walk cycle. */
  step?: number;
}

export function characterSvg(appearance: Appearance, options: CharacterSvgOptions = {}): string {
  const { mode = 'full', mood = 'neutral', breath = 0, blink = false, pose = 'idle', step = 0 } = options;
  const skin = resolveSkinColor(appearance.skin);
  const hair = resolveHairColor(appearance.hair);
  const outfit = resolveOutfitColor(appearance.outfitColor);
  const viewBox = mode === 'bust' ? '30 20 60 66' : '0 0 120 170';
  const bob = breath;

  // Height/build scale about the feet, so the character grows upwards only.
  const sy = mode === 'full' ? clampScale(appearance.height, 0.9, 1.12) : 1;
  const sx = mode === 'full' ? clampScale(appearance.build, 0.9, 1.12) : 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
    <defs>
      <linearGradient id="outfitGrad" x1="60" y1="96" x2="60" y2="150" gradientUnits="userSpaceOnUse">
        <stop stop-color="${lighten(outfit, 0.12)}" />
        <stop offset="1" stop-color="${darken(outfit, 0.1)}" />
      </linearGradient>
      <linearGradient id="skinGrad" x1="60" y1="30" x2="60" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="${lighten(skin, 0.08)}" />
        <stop offset="1" stop-color="${darken(skin, 0.06)}" />
      </linearGradient>
      <linearGradient id="hairGrad" x1="60" y1="22" x2="60" y2="110" gradientUnits="userSpaceOnUse">
        <stop stop-color="${lighten(hair, 0.1)}" />
        <stop offset="1" stop-color="${darken(hair, 0.12)}" />
      </linearGradient>
    </defs>
    ${mode === 'full' ? `<ellipse cx="60" cy="159" rx="31" ry="7.5" fill="${darken(skin, 0.55)}" opacity="0.18" />` : ''}
    <g transform="translate(60 160) scale(${sx} ${sy}) translate(-60 -160) translate(0 ${-bob})">
      ${backHair(appearance.hairStyle, hair)}
      ${mode === 'full' ? legs(outfit, skin, pose, step) : ''}
      ${mode === 'full' ? body(outfit, appearance.outfit, appearance.body) : torso(appearance.outfit, outfit, appearance.body)}
      ${mode === 'full' ? arms(skin, outfit, pose) : ''}
      ${neck(skin)}
      ${head(skin)}
      ${frontHair(appearance.hairStyle, hair)}
      ${face(appearance, { skin, mood, blink })}
      ${accessories(appearance, outfit)}
    </g>
  </svg>`;
}

function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------- */
/*                                  HAIR                                      */
/* -------------------------------------------------------------------------- */

function backHair(style: string, hair: string): string {
  void hair;
  const grad = 'url(#hairGrad)';
  switch (style) {
    case 'long':
      return `<path d="M24 62c0-24 14-38 36-38s36 14 36 38v58c0 6-6 9-11 6l-6-4-8 6-9-6-9 6-8-6-6 4c-5 3-11 0-11-6V62Z" fill="${grad}" />`;
    case 'wavy':
      return `<path d="M24 62c0-24 14-38 36-38s36 14 36 38v44c0 8-6 10-11 6l-7 8-8-8-10 8-10-8-8 8-7-8c-5 4-11 2-11-6V62Z" fill="${grad}" />`;
    case 'bob':
      return `<path d="M26 62c0-23 13-37 34-37s34 14 34 37v22c0 7-6 9-11 6l-5 8-8-7-10 7-10-7-8 7-5-8c-5 3-11 1-11-6V62Z" fill="${grad}" />`;
    case 'bun':
      return `<circle cx="60" cy="24" r="15" fill="${grad}" /><path d="M27 62c0-22 14-36 33-36s33 14 33 36v14c0 8-6 10-11 7l-6-5-9 6-14-6-9 6-6 5c-5 3-11 1-11-7V62Z" fill="${grad}" />`;
    case 'curly':
      return `<g fill="${grad}">${[
        [40, 30, 12],
        [58, 22, 13],
        [78, 28, 12],
        [30, 44, 11],
        [90, 44, 11],
        [28, 60, 10],
        [92, 60, 10],
      ]
        .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" />`)
        .join('')}</g>`;
    case 'afro':
      return `<circle cx="60" cy="52" r="42" fill="${grad}" />`;
    case 'ponytail':
      return `<path d="M27 60c0-22 14-36 33-36s33 14 33 36v10c0 8-6 10-11 7l-6-5-9 6-14-6-9 6-6 5c-5 3-11 1-11-7V60Z" fill="${grad}" /><path d="M92 46c10 2 16 12 14 24-1 9-7 16-15 18 3-6 3-13 1-19-3-8-8-13-8-13 3-3 5-6 8-10Z" fill="${grad}" />`;
    case 'braids':
      return `<path d="M27 62c0-22 13-36 33-36s33 14 33 36v12c0 8-6 10-11 7l-6-5-9 6-14-6-9 6-6 5c-5 3-11 1-11-7V62Z" fill="${grad}" /><g fill="${grad}"><ellipse cx="30" cy="92" rx="8" ry="11" /><ellipse cx="26" cy="108" rx="7" ry="10" /><ellipse cx="30" cy="122" rx="6" ry="8" /><ellipse cx="90" cy="92" rx="8" ry="11" /><ellipse cx="94" cy="108" rx="7" ry="10" /><ellipse cx="90" cy="122" rx="6" ry="8" /></g>`;
    default:
      return `<path d="M28 62c0-22 14-36 32-36s32 14 32 36v8c0 7-6 9-11 6l-7-5-8 6-12-6-8 6-7 5c-5 3-11 1-11-6v-8Z" fill="${grad}" />`;
  }
}

function frontHair(style: string, hair: string): string {
  void hair;
  const grad = 'url(#hairGrad)';
  // Every style shares a "cap" that follows the skull, so no hairstyle ever
  // reads as a bald head when the hair color is lighter than the skin.
  const cap = `<path d="M28 60c0-19 14-32 32-32s32 13 32 32c-6-9-18-14-32-14s-26 5-32 14Z" fill="${grad}" />`;
  switch (style) {
    case 'pixie':
      return `${cap}<path d="M34 54c2-14 12-22 26-22 10 0 18 5 23 14-9-3-15-4-21-2-8 3-14 8-18 16l-10-6Z" fill="${grad}" />`;
    case 'short':
      return `${cap}<path d="M30 58c1-16 13-27 30-27 15 0 26 9 29 24-8-5-16-8-25-8-13 0-22 4-28 11h-6Z" fill="${grad}" />`;
    case 'bun':
    case 'ponytail':
      return `${cap}<path d="M34 52c1-14 12-22 26-22s25 8 26 22c-8-3-14-6-20-5-8 1-13 4-18 8l-6 3-8-6Z" fill="${grad}" />`;
    case 'curly':
    case 'afro':
      return `${cap}<g fill="${grad}"><circle cx="42" cy="34" r="11" /><circle cx="60" cy="29" r="12" /><circle cx="78" cy="35" r="11" /><circle cx="32" cy="46" r="8" /><circle cx="88" cy="46" r="8" /></g>`;
    case 'braids':
      return `${cap}<path d="M32 56c2-13 13-21 28-21s26 8 28 21c-7-4-12-6-18-6-5 3-11 5-16 5-6 0-11-2-16-1l-6 2Z" fill="${grad}" />`;
    default:
      // bob / long / wavy: soft side-swept fringe
      return `${cap}<path d="M34 54c2-14 13-23 26-23s24 9 26 23c-7-5-13-8-20-7-6 1-11 4-16 8l-6 3-10-4Z" fill="${grad}" />`;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  BODY                                      */
/* -------------------------------------------------------------------------- */

function legs(outfit: string, skin: string, pose: CharacterPose, step: number): string {
  const pants = darken(outfit, 0.22);
  const shoe = darken(skin, 0.65);
  if (pose === 'sit') {
    // Slight knee bend: shorter legs, feet forward.
    return `
      <rect x="45" y="126" width="12" height="18" rx="6" fill="${pants}" />
      <rect x="63" y="126" width="12" height="18" rx="6" fill="${pants}" />
      <rect x="41" y="138" width="18" height="9" rx="4.5" fill="${shoe}" />
      <rect x="61" y="138" width="18" height="9" rx="4.5" fill="${shoe}" />`;
  }
  const offset = Math.max(-3, Math.min(3, step));
  return `
    <rect x="${45 - offset}" y="126" width="12" height="24" rx="6" fill="${pants}" />
    <rect x="${63 + offset}" y="126" width="12" height="24" rx="6" fill="${pants}" />
    <rect x="${43 - offset}" y="146" width="16" height="10" rx="5" fill="${shoe}" />
    <rect x="${61 + offset}" y="146" width="16" height="10" rx="5" fill="${shoe}" />`;
}

function silhouette(body: string): string {
  switch (body) {
    case 'slim':
      return 'M45 96c9 3 21 3 30 0 4 1 7 5 7 10l2 23c1 5-3 8-8 8H44c-5 0-9-3-8-8l2-23c0-5 3-9 7-10Z';
    case 'soft':
      return 'M43 96c11 3 23 3 34 0 6 1 9 5 9 10l4 24c1 6-3 9-9 9H39c-6 0-10-3-9-9l4-24c0-5 3-9 9-10Z';
    default:
      return 'M44 96c10 3 22 3 32 0 5 1 8 5 8 10l3 24c1 5-3 8-8 8H41c-5 0-9-3-8-8l3-24c0-5 3-9 8-10Z';
  }
}

function body(outfit: string, style: string, bodyType: string): string {
  const base = `<path d="${silhouette(bodyType)}" fill="url(#outfitGrad)" />`;
  switch (style) {
    case 'dress':
      return `<path d="M44 96h32l11 42c1 5-3 8-8 8H41c-5 0-9-3-8-8l11-42Z" fill="url(#outfitGrad)" /><path d="M44 120h32" stroke="${darken(outfit, 0.15)}" stroke-width="2" stroke-linecap="round" />`;
    case 'hoodie':
      return `${base}<path d="M40 98c4-6 10-9 20-9s16 3 20 9l-4 10H44l-4-10Z" fill="${darken(outfit, 0.12)}" /><rect x="50" y="120" width="20" height="12" rx="4" fill="${darken(outfit, 0.08)}" /><path d="M52 104v10M68 104v10" stroke="#FFF7EA" stroke-width="2.2" stroke-linecap="round" />`;
    case 'jacket':
      return `${base}<path d="M60 98v40" stroke="${darken(outfit, 0.3)}" stroke-width="2" /><path d="M48 99l12 10 12-10" stroke="${darken(outfit, 0.25)}" stroke-width="2" fill="none" /><path d="M56 110h8l2 18h-12l2-18Z" fill="${lighten(outfit, 0.5)}" />`;
    case 'suit':
      return `${base}<path d="M50 98l10 14 10-14" fill="${lighten(outfit, 0.6)}" /><path d="M58 112h4l2 10h-8l2-10Z" fill="${darken(outfit, 0.35)}" /><circle cx="60" cy="130" r="2.2" fill="#FFE2A8" />`;
    case 'overalls':
      return `${base}<rect x="46" y="108" width="28" height="26" rx="7" fill="${darken(outfit, 0.18)}" /><path d="M48 100l-2 10M72 100l2 10" stroke="${darken(outfit, 0.18)}" stroke-width="4" stroke-linecap="round" />`;
    case 'sweater':
      return `${base}<path d="M44 99h32" stroke="${darken(outfit, 0.15)}" stroke-width="4" stroke-linecap="round" /><path d="M50 104h20" stroke="${lighten(outfit, 0.35)}" stroke-width="2" stroke-linecap="round" />`;
    case 'kimono':
      return `${base}<path d="M50 98l10 12 10-12" stroke="${lighten(outfit, 0.45)}" stroke-width="4" fill="none" /><path d="M46 126h28l-2 8H48l-2-8Z" fill="${darken(outfit, 0.2)}" />`;
    case 'sport':
      return `${base}<path d="M44 108h32v5H44z" fill="${lighten(outfit, 0.55)}" /><path d="M48 99l24 8" stroke="${darken(outfit, 0.2)}" stroke-width="2" />`;
    case 'tank':
      return `<path d="M46 98h28l4 32c0 5-4 8-9 8H51c-5 0-9-3-9-8l4-32Z" fill="url(#outfitGrad)" />`;
    case 'tshirt':
      return `<path d="M46 98h28l5 32c1 5-3 8-8 8H49c-5 0-9-3-8-8l5-32Z" fill="url(#outfitGrad)" /><path d="M52 99c2 4 14 4 16 0" stroke="${darken(outfit, 0.18)}" stroke-width="2" fill="none" />`;
    default:
      return base;
  }
}

/** Bust mode: only shoulders and collar are visible. */
function torso(style: string, outfit: string, bodyType: string): string {
  void bodyType;
  const collar =
    style === 'suit'
      ? `<path d="M50 92l10 14 10-14" fill="${lighten(outfit, 0.6)}" />`
      : style === 'hoodie'
        ? `<path d="M46 96c3-6 9-9 14-9s11 3 14 9l-4 6H50l-4-6Z" fill="${darken(outfit, 0.12)}" />`
        : '';
  return `<path d="M30 92h60v14a18 18 0 0 1-18 14H48a18 18 0 0 1-18-14V92Z" fill="url(#outfitGrad)" />${collar}`;
}

function arms(skin: string, outfit: string, pose: CharacterPose): string {
  const sleeve = darken(outfit, 0.06);
  const lift = pose === 'walk' ? 2 : 0;
  return `
    <rect x="31" y="${98 - lift}" width="13" height="${31 + lift}" rx="6.5" fill="${sleeve}" />
    <rect x="76" y="98" width="13" height="31" rx="6.5" fill="${sleeve}" />
    <circle cx="37.5" cy="${129}" r="6.4" fill="${skin}" />
    <circle cx="82.5" cy="129" r="6.4" fill="${skin}" />`;
}

function neck(skin: string): string {
  return `<rect x="53" y="88" width="14" height="14" rx="6" fill="${darken(skin, 0.1)}" />`;
}

function head(skin: string): string {
  return `
    <circle cx="38" cy="60" r="7" fill="${darken(skin, 0.06)}" />
    <circle cx="82" cy="60" r="7" fill="${darken(skin, 0.06)}" />
    <circle cx="60" cy="56" r="31" fill="url(#skinGrad)" />`;
}

/* -------------------------------------------------------------------------- */
/*                                  FACE                                      */
/* -------------------------------------------------------------------------- */

function face(
  appearance: Appearance,
  { skin, mood, blink }: { skin: string; mood: CharacterMood; blink: boolean },
): string {
  const eye = '#3B2C29';
  const iris = resolveEye(appearance.eyes).iris;
  const shape = resolveEye(appearance.eyes).shape;
  const closed = `<path d="M44 60q4 4 8 0" stroke="${eye}" stroke-width="2.4" stroke-linecap="round" fill="none" />
    <path d="M68 60q4 4 8 0" stroke="${eye}" stroke-width="2.4" stroke-linecap="round" fill="none" />`;
  const open = () => {
    const eyePair = (cx: number) => {
      switch (shape) {
        case 'almond':
          return `<path d="M${cx - 5} 60q5-5 10 0-5 6-10 0Z" fill="${iris}" /><circle cx="${cx + 1}" cy="59.2" r="1.2" fill="#fff" />`;
        case 'wide':
          return `<circle cx="${cx}" cy="60" r="4.8" fill="${iris}" /><circle cx="${cx}" cy="60" r="2.4" fill="${eye}" /><circle cx="${cx + 1.2}" cy="58.4" r="1.2" fill="#fff" />`;
        case 'sleepy':
          return `<path d="M${cx - 5} 61q5-4 10 0" stroke="${eye}" stroke-width="2.6" stroke-linecap="round" fill="none" /><circle cx="${cx}" cy="62" r="1.2" fill="${iris}" />`;
        case 'cat':
          return `<path d="M${cx - 5} 61q2-6 5-2 3-4 5 2-5 4-10 0Z" fill="${iris}" /><circle cx="${cx}" cy="60" r="1.1" fill="#fff" />`;
        case 'sparkle':
          return `<ellipse cx="${cx}" cy="60" rx="3.8" ry="4.6" fill="${darken(iris, 0.15)}" /><circle cx="${cx + 0.8}" cy="58.4" r="1.5" fill="#fff" /><circle cx="${cx - 1.2}" cy="61.6" r="0.8" fill="${lighten(iris, 0.5)}" />`;
        default:
          return `<ellipse cx="${cx}" cy="60" rx="3.6" ry="4.4" fill="${iris}" /><circle cx="${cx + 0.9}" cy="58.6" r="1.3" fill="#fff" />`;
      }
    };
    return eyePair(48) + eyePair(72);
  };
  const brows = browShape(appearance.brows, skin);

  const mouth =
    mood === 'happy'
      ? mouthShape(appearance.mouth, eye, true)
      : mood === 'sleepy'
        ? `<ellipse cx="60" cy="73" rx="3" ry="2.4" fill="${eye}" />`
        : mouthShape(appearance.mouth, eye, false);
  const blush = `<ellipse cx="39" cy="69" rx="5" ry="3" fill="#F29B9B" opacity="0.45" />
    <ellipse cx="81" cy="69" rx="5" ry="3" fill="#F29B9B" opacity="0.45" />`;
  const freckles =
    appearance.accessory === 'freckles'
      ? `<g fill="${darken(skin, 0.28)}" opacity="0.75"><circle cx="42" cy="66" r="1" /><circle cx="45" cy="68.5" r="1" /><circle cx="39" cy="68" r="1" /><circle cx="76" cy="66" r="1" /><circle cx="79" cy="68.5" r="1" /><circle cx="73" cy="68" r="1" /></g>`
      : '';
  return `${brows}${blink || mood === 'sleepy' ? closed : open()}${noseShape(appearance.nose, skin)}${mouth}${blush}${freckles}`;
}

function browShape(style: string, skin: string): string {
  const color = darken(skin, 0.45);
  // Each entry is two sub-paths starting at the left and right brow.
  const pairs: Record<string, string> = {
    'brows-1': 'M43 51q5-3 9-1M68 50q4-2 9 1',
    'brows-2': 'M42 50q5-2 10-1M68 49q5-1 10 1',
    'brows-3': 'M43 52q5-1 9 0M68 52q4-1 9 0',
    'brows-4': 'M42 49q6-4 10-1M68 48q4-3 10 1',
    'brows-5': 'M43 51q5-1 8 1M69 52q3-2 8-1',
    'brows-6': 'M42 51q5-3 10 0M68 51q5-3 10 0',
    'brows-7': 'M43 50q4-3 9-2M68 48q5-1 9 2',
    'brows-8': 'M42 52q6-2 10 0M68 52q4-2 10 0',
    'brows-9': 'M43 49q4-2 8 0M69 49q4-2 8 0',
    'brows-10': 'M42 51q6-2 10 1M68 52q4-3 10-1',
  };
  const definition = pairs[style] ?? pairs['brows-1'] ?? '';
  return definition
    .split('M')
    .filter(Boolean)
    .map((path) => `<path d="M${path}" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none" />`)
    .join('');
}

function noseShape(style: string, skin: string): string {
  const color = darken(skin, 0.22);
  const shapes: Record<string, string> = {
    'nose-1': '<path d="M60 65v2" stroke="%C" stroke-width="1.8" stroke-linecap="round" />',
    'nose-2': '<circle cx="60" cy="67" r="1.4" fill="%C" opacity="0.8" />',
    'nose-3': '<path d="M59 66q1 1.6 2 0" stroke="%C" stroke-width="1.6" stroke-linecap="round" fill="none" />',
    'nose-4': '<ellipse cx="60" cy="66.5" rx="1.2" ry="0.9" fill="%C" opacity="0.7" />',
    'nose-5': '<path d="M60 64.5v2.2" stroke="%C" stroke-width="2.2" stroke-linecap="round" />',
    'nose-6': '<path d="M58.6 67h2.8" stroke="%C" stroke-width="1.6" stroke-linecap="round" />',
    'nose-7': '<circle cx="60" cy="66.8" r="1" fill="%C" />',
    'nose-8': '<path d="M60 65.5v1.6" stroke="%C" stroke-width="1.4" stroke-linecap="round" />',
    'nose-9': '<circle cx="59.6" cy="66.6" r="1.1" fill="%C" opacity="0.85" />',
    'nose-10': '<circle cx="60.4" cy="66.8" r="1" fill="%C" opacity="0.75" />',
  };
  return (shapes[style] ?? shapes['nose-1']!).replaceAll('%C', color);
}

function mouthShape(style: string, eye: string, happy: boolean): string {
  const shapes: Record<string, string> = {
    'mouth-1': 'M55 72q5 5 10 0',
    'mouth-2': 'M56 73q4 3 8 0',
    'mouth-3': 'M55.5 72.5q4.5 6 9 0Z',
    'mouth-4': 'M56 73.5q4-3 8 0',
    'mouth-5': 'M54.5 72q5.5 4 11 0',
    'mouth-6': 'M57 73q3 2.6 6 0',
    'mouth-7': 'M56 72q4 4 8 0q-4 1.4-8 0Z',
    'mouth-8': 'M55 72.4q5 4.4 10 0',
    'mouth-9': 'M57.4 73h5.2',
    'mouth-10': 'M56 72.6q4 3.6 8 0',
  };
  const stroke = shapes[style] ?? shapes['mouth-1']!;
  if (style === 'mouth-3' || style === 'mouth-7') {
    return `<path d="${stroke}" fill="${happy ? '#C96A66' : 'none'}" stroke="${eye}" stroke-width="1.8" stroke-linecap="round" />`;
  }
  return `<path d="${stroke}" stroke="${eye}" stroke-width="${happy ? 2.4 : 2}" stroke-linecap="round" fill="none" />`;
}

/* -------------------------------------------------------------------------- */
/*                               ACCESSORIES                                  */
/* -------------------------------------------------------------------------- */

function accessories(appearance: Appearance, outfit: string): string {
  const accessory = appearance.accessory;
  const layers: string[] = [];
  switch (accessory) {
    case 'glasses':
      layers.push(
        `<g stroke="#5A4A42" stroke-width="1.6" fill="#FFFFFF" fill-opacity="0.25"><circle cx="48" cy="60" r="7.4" /><circle cx="72" cy="60" r="7.4" /><path d="M55.4 60h9.2M40.6 59l-4-2M79.4 59l4-2" fill="none" stroke-linecap="round" /></g>`,
      );
      break;
    case 'sunglasses':
      layers.push(
        `<g fill="#3E3A4A"><rect x="39" y="55" width="19" height="11" rx="5.5" /><rect x="62" y="55" width="19" height="11" rx="5.5" /><path d="M58 59h4" stroke="#3E3A4A" stroke-width="2.4" /></g><path d="M43 58.5l5 3M66 58.5l5 3" stroke="#FFFFFF" stroke-width="1.2" opacity="0.5" stroke-linecap="round" />`,
      );
      break;
    case 'earrings':
      layers.push(
        `<circle cx="31.5" cy="67" r="2.6" fill="none" stroke="#F2C14E" stroke-width="1.8" /><circle cx="88.5" cy="67" r="2.6" fill="none" stroke="#F2C14E" stroke-width="1.8" />`,
      );
      break;
    case 'headphones':
      layers.push(
        `<path d="M28 58c0-20 14-32 32-32s32 12 32 32" stroke="#4A5568" stroke-width="4.6" fill="none" stroke-linecap="round" /><rect x="24" y="54" width="10" height="18" rx="5" fill="#4A5568" /><rect x="86" y="54" width="10" height="18" rx="5" fill="#4A5568" /><rect x="26.5" y="58" width="5" height="10" rx="2.5" fill="#A9B4BC" /><rect x="88.5" y="58" width="5" height="10" rx="2.5" fill="#A9B4BC" />`,
      );
      break;
    case 'beanie':
      layers.push(
        `<path d="M29 54c0-18 14-30 31-30s31 12 31 30c-9-6-20-9-31-9s-22 3-31 9Z" fill="#E8674F" /><rect x="27" y="50" width="66" height="10" rx="5" fill="#C9523C" /><circle cx="60" cy="22" r="5" fill="#FFE2A8" />`,
      );
      break;
    case 'cap':
      layers.push(
        `<path d="M31 52c0-16 13-27 29-27s29 11 29 27H31Z" fill="#4E7C6B" /><path d="M60 25v27" stroke="#3D6656" stroke-width="1.4" opacity="0.5" /><path d="M60 52h30c4 0 6 3 4 6H60v-6Z" fill="#3D6656" />`,
      );
      break;
    case 'scarf':
      layers.push(
        `<path d="M45 90c9 4 21 4 30 0l3 8c-11 4-25 4-36 0l3-8Z" fill="#B79CE8" /><path d="M74 96l6 14-7 2-4-13Z" fill="#9377C9" />`,
      );
      break;
    case 'bow':
      layers.push(
        `<g transform="translate(82 34)"><path d="M0 0c-8-5-14 0-12 5 2 5 8 4 12 0Z" fill="#F4A9BE" /><path d="M0 0c8-5 14 0 12 5-2 5-8 4-12 0Z" fill="#F4A9BE" /><circle cx="0" cy="2.5" r="2.4" fill="#E88AA3" /></g>`,
      );
      break;
    default:
      break;
  }
  if (outfit === 'suit') {
    layers.push(`<circle cx="60" cy="118" r="2.4" fill="#FFE2A8" />`);
  }
  return layers.join('');
}

/* -------------------------------------------------------------------------- */
/*                              COLOR HELPERS                                 */
/* -------------------------------------------------------------------------- */

/** Very small hex lighten/darken helpers kept local so the shared package stays lean. */
export function lighten(hex: string, amount: number): string {
  return shift(hex, Math.round(255 * amount));
}

export function darken(hex: string, amount: number): string {
  return shift(hex, -Math.round(255 * amount));
}

function shift(hex: string, delta: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(((value >> 16) & 255) + delta);
  const g = clamp(((value >> 8) & 255) + delta);
  const b = clamp((value & 255) + delta);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Data URI used by <img> in React. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
