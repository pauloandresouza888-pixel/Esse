/**
 * Character model + appearance options.
 *
 * Every category has at least 10 options (the studio creator shows them as
 * swatches). Options are data only — the SVG generator in the client decides how
 * to draw each id — so the save file, the server (Phase 3) and the art agree on
 * the same vocabulary.
 */

export type Gender = 'feminine' | 'masculine' | 'neutral';

export interface AppearanceOption {
  id: string;
  color?: string;
  /** Extra data interpreted by the sprite generator (e.g. hair style id). */
  style?: string;
}

export interface Appearance {
  /* Body */
  skin: string;
  /** 0.94 .. 1.06 in 10 steps (screen slider). */
  height: number;
  /** 0.92 .. 1.08 in 10 steps (body weight). */
  build: number;
  /** Silhouette family: slim, average, soft. */
  body: string;

  /* Hair */
  hair: string;
  hairStyle: string;

  /* Face */
  eyes: string;
  brows: string;
  nose: string;
  mouth: string;

  /* Style */
  outfit: string;
  outfitColor: string;
  shoes: string;
  accessory: string;
}

export const SKIN_TONES: readonly { id: string; color: string }[] = [
  { id: 'skin-1', color: '#FDE0C8' },
  { id: 'skin-2', color: '#F7C9A3' },
  { id: 'skin-3', color: '#EBB083' },
  { id: 'skin-4', color: '#D89B6C' },
  { id: 'skin-5', color: '#B97A50' },
  { id: 'skin-6', color: '#98603B' },
  { id: 'skin-7', color: '#74452B' },
  { id: 'skin-8', color: '#563320' },
  { id: 'skin-9', color: '#C98E70' },
  { id: 'skin-10', color: '#A76B4C' },
];

export const HAIR_COLORS: readonly { id: string; color: string }[] = [
  { id: 'hair-1', color: '#2B2118' },
  { id: 'hair-2', color: '#4A2F1D' },
  { id: 'hair-3', color: '#7A4A2B' },
  { id: 'hair-4', color: '#B07340' },
  { id: 'hair-5', color: '#D9A05B' },
  { id: 'hair-6', color: '#E8CF9E' },
  { id: 'hair-7', color: '#8E2F3C' },
  { id: 'hair-8', color: '#4B3F72' },
  { id: 'hair-9', color: '#2F6B5B' },
  { id: 'hair-10', color: '#9B9B9B' },
];

export const HAIR_STYLES = [
  'bob',
  'long',
  'bun',
  'curly',
  'short',
  'ponytail',
  'braids',
  'pixie',
  'wavy',
  'afro',
] as const;

export const OUTFIT_STYLES = [
  'sweater',
  'tshirt',
  'hoodie',
  'dress',
  'jacket',
  'overalls',
  'suit',
  'tank',
  'kimono',
  'sport',
] as const;

export const OUTFIT_COLORS: readonly { id: string; color: string }[] = [
  { id: 'outfit-1', color: '#F28F79' },
  { id: 'outfit-2', color: '#F6C56B' },
  { id: 'outfit-3', color: '#8CCF9E' },
  { id: 'outfit-4', color: '#79B8E8' },
  { id: 'outfit-5', color: '#A78BDB' },
  { id: 'outfit-6', color: '#F2A8C0' },
  { id: 'outfit-7', color: '#E8674F' },
  { id: 'outfit-8', color: '#4E7C6B' },
  { id: 'outfit-9', color: '#3E4A6B' },
  { id: 'outfit-10', color: '#EDE3D0' },
];

/**
 * Eye options: a shape id plus the iris color. Ten pairs keep the creator
 * readable (the player sees faces, not 50 combinations).
 */
export interface EyeOption {
  id: string;
  shape: 'round' | 'almond' | 'wide' | 'sleepy' | 'cat' | 'sparkle';
  iris: string;
}

export const EYE_OPTIONS: readonly EyeOption[] = [
  { id: 'eyes-1', shape: 'round', iris: '#5B3A29' },
  { id: 'eyes-2', shape: 'almond', iris: '#8A5A2B' },
  { id: 'eyes-3', shape: 'wide', iris: '#4E7C4A' },
  { id: 'eyes-4', shape: 'sleepy', iris: '#3E5C8A' },
  { id: 'eyes-5', shape: 'cat', iris: '#6E6E78' },
  { id: 'eyes-6', shape: 'sparkle', iris: '#7A5CA8' },
  { id: 'eyes-7', shape: 'round', iris: '#3D6E6A' },
  { id: 'eyes-8', shape: 'almond', iris: '#A85F5F' },
  { id: 'eyes-9', shape: 'wide', iris: '#B98A2B' },
  { id: 'eyes-10', shape: 'sparkle', iris: '#2F4F7A' },
];

export const BROW_OPTIONS = [
  'brows-1',
  'brows-2',
  'brows-3',
  'brows-4',
  'brows-5',
  'brows-6',
  'brows-7',
  'brows-8',
  'brows-9',
  'brows-10',
] as const;

export const NOSE_OPTIONS = [
  'nose-1',
  'nose-2',
  'nose-3',
  'nose-4',
  'nose-5',
  'nose-6',
  'nose-7',
  'nose-8',
  'nose-9',
  'nose-10',
] as const;

export const MOUTH_OPTIONS = [
  'mouth-1',
  'mouth-2',
  'mouth-3',
  'mouth-4',
  'mouth-5',
  'mouth-6',
  'mouth-7',
  'mouth-8',
  'mouth-9',
  'mouth-10',
] as const;

export const ACCESSORY_OPTIONS = [
  'none',
  'glasses',
  'sunglasses',
  'earrings',
  'headphones',
  'beanie',
  'cap',
  'scarf',
  'freckles',
  'bow',
] as const;

export const BODY_TYPES = ['slim', 'average', 'soft'] as const;

/** Height/build steps shown as 10-stop sliders in the creator. */
export const HEIGHT_STEPS = [0.94, 0.953, 0.966, 0.979, 0.993, 1, 1.013, 1.027, 1.04, 1.06] as const;
export const BUILD_STEPS = [0.92, 0.938, 0.956, 0.973, 0.991, 1, 1.018, 1.036, 1.054, 1.08] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 'skin-2',
  height: 1,
  build: 1,
  body: 'average',
  hair: 'hair-2',
  hairStyle: 'bob',
  eyes: 'eyes-1',
  brows: 'brows-1',
  nose: 'nose-1',
  mouth: 'mouth-1',
  outfit: 'sweater',
  outfitColor: 'outfit-1',
  shoes: '#5B4B3A',
  accessory: 'none',
};

export interface Character {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
  /** In-game minutes lived, used later for ageing and stats. */
  minutesLived: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  appearance: Appearance;
  /** Short line shown under the name in the "Continue" card. */
  taglineKey: string;
}

/**
 * Fills in appearance fields added in later versions. Saves from Phase 0 (and
 * any hand-written test fixture) only had skin/hair/outfit; everything else
 * falls back to the default so old saves keep opening.
 */
export function normalizeAppearance(input: Partial<Appearance> | undefined): Appearance {
  const base = { ...DEFAULT_APPEARANCE };
  if (!input) return base;
  for (const key of Object.keys(base) as (keyof Appearance)[]) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof base[key] === 'number') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) (base as Record<string, unknown>)[key] = numeric;
    } else {
      (base as Record<string, unknown>)[key] = String(value);
    }
  }
  return base;
}

/** Deterministic starter character used by the game and by tests. */
export function createCharacterForTest(): Character {
  return {
    id: 'char-test',
    name: 'Lia',
    age: 24,
    gender: 'feminine',
    appearance: { ...DEFAULT_APPEARANCE },
    traits: ['cheerful', 'creative', 'foodie', 'social', 'curious'],
    aspiration: 'chef',
    minutesLived: 0,
  };
}

export function resolveSkin(id: string): string {
  return SKIN_TONES.find((tone) => tone.id === id)?.color ?? DEFAULT_APPEARANCE.skin;
}

export function resolveHairColor(id: string): string {
  return HAIR_COLORS.find((tone) => tone.id === id)?.color ?? '#4A2F1D';
}

export function resolveOutfitColor(id: string): string {
  return OUTFIT_COLORS.find((tone) => tone.id === id)?.color ?? '#F28F79';
}

export function resolveSkinColor(id: string): string {
  return SKIN_TONES.find((tone) => tone.id === id)?.color ?? '#F7C9A3';
}

export function resolveEye(id: string): EyeOption {
  return EYE_OPTIONS.find((option) => option.id === id) ?? (EYE_OPTIONS[0] as EyeOption);
}

/** i18n key for a creator option (names live in the translation files). */
export function appearanceLabelKey(category: string, id: string): string {
  return `appearance.${category}.${id}`;
}

/**
 * Validates a creator draft: 5 traits, a name with 2–20 characters and a known
 * aspiration. Used by the UI (to disable "finish") and by the store.
 */
export function validateCharacterDraft(draft: {
  name: string;
  traits: string[];
  aspiration: string;
}): { ok: boolean; error: 'name' | 'traits' | 'aspiration' | null } {
  const name = draft.name.trim();
  if (name.length < 2 || name.length > 20) return { ok: false, error: 'name' };
  const traits = new Set(draft.traits);
  if (traits.size !== 5) return { ok: false, error: 'traits' };
  if (!draft.aspiration) return { ok: false, error: 'aspiration' };
  return { ok: true, error: null };
}
