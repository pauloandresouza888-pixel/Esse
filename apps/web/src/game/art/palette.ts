/**
 * Art palette for the procedural graphics.
 *
 * Every color lives here (not sprinkled in the drawing code) so the whole game
 * can be re-themed, and so night variants can reference the same names. The
 * palette is deliberately pastel: high chroma fatigues the eyes on a phone
 * screen, low chroma reads as "cheap".
 */
export const ART = {
  floor: '#F6DFC2',
  floorDark: '#EFD1AE',
  floorLight: '#FBEBD5',
  plank: '#E8C8A2',
  rug: '#F3C9C0',
  rugAlt: '#E8B0A6',
  rugCream: '#FFF3E4',
  wall: '#FFF6E6',
  wallShade: '#F3E2CB',
  wallTrim: '#EAD4B8',
  windowFrame: '#FFFDF7',
  windowSkyDay: '#A9D9F2',
  windowSkyDawn: '#F8C4A0',
  windowSkyDusk: '#E2A2A8',
  windowSkyNight: '#2E3A5C',
  wood: '#C69063',
  woodDark: '#A9713F',
  woodLight: '#E0B489',
  white: '#FFFDF8',
  cream: '#FFF7EA',
  metal: '#C9D2D8',
  metalDark: '#A9B4BC',
  screen: '#3E4C63',
  screenGlow: '#8FD3E8',
  mint: '#8FD6B5',
  mintDark: '#5FB894',
  coral: '#FF8A6A',
  coralDark: '#E8674F',
  sun: '#F7C568',
  sunDark: '#E5A83F',
  lilac: '#B79CE8',
  lilacDark: '#9377C9',
  sky: '#8CBFE6',
  pink: '#F4A9BE',
  leaf: '#7FBF8F',
  leafDark: '#5C9E6E',
  leafLight: '#A8D8AE',
  catFur: '#E9A063',
  catFurLight: '#F6C79B',
  catDark: '#B97640',
  shadow: 'rgba(120, 84, 58, 0.18)',
  shadowSoft: 'rgba(120, 84, 58, 0.10)',
  ink: '#4A3A33',
  inkSoft: '#7A6459',
  glass: 'rgba(190, 226, 240, 0.55)',
  glassEdge: 'rgba(255, 255, 255, 0.75)',
} as const;

export type ArtColor = keyof typeof ART;
