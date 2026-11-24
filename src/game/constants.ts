import type {
  FloorStyleId, NeedKey, Season, SkillKey, WallStyleId, Weather,
} from './types';

export const TILE = 1.25;
export const LOT_W = 22;
export const LOT_D = 22;
export const WALL_HEIGHT = 2.75;
export const WALL_THICKNESS = 0.14;
export const MINUTES_PER_DAY = 1440;
export const MAX_SIMS = 6;
export const DAYS_PER_SEASON = 7;

export const HOUSE = { x0: 4, z0: 4, w: 14, d: 13 };
export const POOL = { x0: 2, z0: 18, w: 6, d: 4 };
export const DRIVEWAY = { x0: 8, z0: 18, w: 5, d: 4 };

export const tileKey = (x: number, z: number) => `${x},${z}`;
export const wallKey = (axis: 'h' | 'v', x: number, z: number) => `${axis}:${x},${z}`;

export function parseWallKey(key: string): { axis: 'h' | 'v'; x: number; z: number } | null {
  const match = /^([hv]):(-?\d+),(-?\d+)$/.exec(key);
  if (!match) return null;
  return { axis: match[1] as 'h' | 'v', x: Number(match[2]), z: Number(match[3]) };
}

export function isInsideLot(x: number, z: number) {
  return x >= 0 && z >= 0 && x < LOT_W && z < LOT_D;
}

export function isPoolTile(x: number, z: number) {
  return x >= POOL.x0 && x < POOL.x0 + POOL.w && z >= POOL.z0 && z < POOL.z0 + POOL.d;
}

export function isDrivewayTile(x: number, z: number) {
  return x >= DRIVEWAY.x0 && x < DRIVEWAY.x0 + DRIVEWAY.w && z >= DRIVEWAY.z0 && z < DRIVEWAY.z0 + DRIVEWAY.d;
}

export function isHouseTile(x: number, z: number) {
  return x >= HOUSE.x0 && x < HOUSE.x0 + HOUSE.w && z >= HOUSE.z0 && z < HOUSE.z0 + HOUSE.d;
}

export const gridX = (x: number) => (x - LOT_W / 2) * TILE;
export const gridZ = (z: number) => (z - LOT_D / 2) * TILE;
export const tileCenterX = (x: number) => (x + 0.5 - LOT_W / 2) * TILE;
export const tileCenterZ = (z: number) => (z + 0.5 - LOT_D / 2) * TILE;

export function objectCenterX(x: number, w: number) {
  return (x + w / 2 - LOT_W / 2) * TILE;
}
export function objectCenterZ(z: number, d: number) {
  return (z + d / 2 - LOT_D / 2) * TILE;
}

export function worldToTile(wx: number, wz: number) {
  return {
    x: Math.floor(wx / TILE + LOT_W / 2),
    z: Math.floor(wz / TILE + LOT_D / 2),
  };
}

export function worldToEdge(wx: number, wz: number) {
  const fx = wx / TILE + LOT_W / 2;
  const fz = wz / TILE + LOT_D / 2;
  const hZ = Math.round(fz);
  const hX = Math.floor(fx);
  const vX = Math.round(fx);
  const vZ = Math.floor(fz);
  const dh = Math.abs(fz - hZ);
  const dv = Math.abs(fx - vX);
  if (dv < dh) return { axis: 'v' as const, x: vX, z: vZ };
  return { axis: 'h' as const, x: hX, z: hZ };
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatClock(minutes: number) {
  const m = ((Math.floor(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function seasonFromDay(day: number): Season {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  return seasons[Math.floor((day - 1) / DAYS_PER_SEASON) % 4];
}

export function formatDay(day: number, season: Season) {
  return `${SEASON_META[season].short} · Dia ${day}`;
}

export const NEED_KEYS: NeedKey[] = ['hunger', 'energy', 'hygiene', 'fun', 'social', 'bladder'];
export const SKILL_KEYS: SkillKey[] = ['cooking', 'fitness', 'logic', 'charisma', 'creativity'];

export const NEEDS_META: Record<NeedKey, { label: string; short: string; icon: string; color: string; low: string }> = {
  hunger: { label: 'Fome', short: 'Fome', icon: '🍽️', color: '#ffb459', low: 'Precisa comer' },
  energy: { label: 'Energia', short: 'Energia', icon: '⚡', color: '#8ecbff', low: 'Precisa descansar' },
  hygiene: { label: 'Higiene', short: 'Higiene', icon: '🫧', color: '#72dfd0', low: 'Precisa se lavar' },
  fun: { label: 'Diversão', short: 'Diversão', icon: '✨', color: '#d99bff', low: 'Precisa se divertir' },
  social: { label: 'Social', short: 'Social', icon: '💬', color: '#ff8fa8', low: 'Precisa conversar' },
  bladder: { label: 'Bexiga', short: 'Bexiga', icon: '💧', color: '#8ab6ff', low: 'Precisa ir ao banheiro' },
};

export const SKILL_META: Record<SkillKey, { label: string; icon: string; color: string }> = {
  cooking: { label: 'Culinária', icon: '👩‍🍳', color: '#ffb459' },
  fitness: { label: 'Condicionamento', icon: '🏋️', color: '#ff8a7a' },
  logic: { label: 'Lógica', icon: '🧠', color: '#8ecbff' },
  charisma: { label: 'Carisma', icon: '🎙️', color: '#ff8fa8' },
  creativity: { label: 'Criatividade', icon: '🎨', color: '#d99bff' },
};

export const WEATHER_META: Record<Weather, { label: string; icon: string; color: string }> = {
  clear: { label: 'Céu limpo', icon: '☀️', color: '#ffd07a' },
  cloudy: { label: 'Nublado', icon: '⛅', color: '#b7c6d6' },
  rain: { label: 'Chuva', icon: '🌧️', color: '#86b9ff' },
  storm: { label: 'Tempestade', icon: '⛈️', color: '#a78bfa' },
};

export const SEASON_META: Record<Season, { label: string; short: string; icon: string; tint: string }> = {
  spring: { label: 'Primavera', short: 'Primavera', icon: '🌸', tint: '#a8d88b' },
  summer: { label: 'Verão', short: 'Verão', icon: '☀️', tint: '#e2c36a' },
  autumn: { label: 'Outono', short: 'Outono', icon: '🍂', tint: '#d9945b' },
  winter: { label: 'Inverno', short: 'Inverno', icon: '❄️', tint: '#b8d2e8' },
};

export const FLOOR_STYLES: Record<FloorStyleId, { label: string; icon: string; color: string; price: number; pattern: string }> = {
  grass: { label: 'Grama', icon: '🌿', color: '#5f8f55', price: 0, pattern: 'grass' },
  wood: { label: 'Madeira', icon: '🪵', color: '#b47c4b', price: 32, pattern: 'wood' },
  tile: { label: 'Porcelanato', icon: '◻️', color: '#d8d2c7', price: 28, pattern: 'tile' },
  marble: { label: 'Mármore', icon: '⬜', color: '#e6e3dc', price: 52, pattern: 'marble' },
  carpet: { label: 'Carpete', icon: '🟫', color: '#b58a76', price: 22, pattern: 'carpet' },
  concrete: { label: 'Concreto', icon: '▫️', color: '#9aa0a2', price: 18, pattern: 'concrete' },
  stone: { label: 'Pedra', icon: '🪨', color: '#9b9488', price: 36, pattern: 'stone' },
  deck: { label: 'Deck', icon: '▤', color: '#a67545', price: 40, pattern: 'deck' },
  water: { label: 'Água', icon: '🌊', color: '#49a9c4', price: 0, pattern: 'water' },
};

export const WALL_STYLES: Record<WallStyleId, { label: string; icon: string; color: string; price: number; pattern: string }> = {
  stucco: { label: 'Reboco claro', icon: '▫️', color: '#e8ddcc', price: 90, pattern: 'stucco' },
  brick: { label: 'Tijolo aparente', icon: '🧱', color: '#a65b44', price: 130, pattern: 'brick' },
  wood: { label: 'Ripado de madeira', icon: '▤', color: '#9a6740', price: 150, pattern: 'woodPanel' },
  accent: { label: 'Parede destaque', icon: '🎨', color: '#3f5963', price: 110, pattern: 'accent' },
  panel: { label: 'Painel concreto', icon: '⬛', color: '#777d80', price: 120, pattern: 'concrete' },
};

export const WALL_KIND_META = {
  wall: { label: 'Parede', icon: '▬', price: 90 },
  door: { label: 'Porta', icon: '🚪', price: 320 },
  window: { label: 'Janela', icon: '🪟', price: 240 },
  erase: { label: 'Apagar', icon: '⌫', price: 0 },
} as const;

export function moodLabel(mood: number) {
  if (mood >= 85) return { label: 'Inspirado', icon: '🤩', color: '#7ee0a8' };
  if (mood >= 68) return { label: 'Feliz', icon: '😊', color: '#a8dd8b' };
  if (mood >= 48) return { label: 'Neutro', icon: '🙂', color: '#f1cf77' };
  if (mood >= 28) return { label: 'Irritado', icon: '😕', color: '#f2a36b' };
  return { label: 'Muito mal', icon: '😣', color: '#ff7b7b' };
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
