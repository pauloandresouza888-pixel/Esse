/**
 * Brand constants. UI never hardcodes the name, so renaming the game later is a
 * one-line change (and both languages stay in sync).
 */
export const GAME_BRAND = {
  /** Working title. */
  name: 'Vida Online',
  taglineKey: 'brand.tagline',
  /** Palette used by the PWA theme-color and the loading screens. */
  themeColor: '#FF7A59',
  backgroundColor: '#FFF4E6',
  version: '0.1.0',
} as const;

/** Where the logo lives, split so Vite only downloads the format it needs. */
export const LOGO_PATHS = {
  mark: '/brand/logo-mark.svg',
  full: '/brand/logo-full.svg',
  maskable: '/icons/maskable-512.png',
} as const;
