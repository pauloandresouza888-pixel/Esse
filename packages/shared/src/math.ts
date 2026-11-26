/** Small numeric and color helpers shared by client, art code and future server. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/** Smooth 0..1 easing used for camera moves and UI transitions. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function roundTo(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** "#RRGGBB" -> { r, g, b } (0..255). Invalid input falls back to black. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(
    lerp(first.r, second.r, k),
    lerp(first.g, second.g, k),
    lerp(first.b, second.b, k),
  );
}

/** Mixes a color towards black (amount < 0) or white (amount > 0), -1..1. */
export function shadeHex(hex: string, amount: number): string {
  const target = amount >= 0 ? '#ffffff' : '#000000';
  return mixHex(hex, target, Math.abs(amount));
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}
