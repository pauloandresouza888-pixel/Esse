import { create } from 'zustand';
import {
  createFriendCode,
  DEFAULT_APPEARANCE,
  type Appearance,
  type Gender,
} from '@vida/shared';
import { storage } from '@/platform/storage';

/**
 * Character creator draft.
 *
 * The draft lives outside the save on purpose: the player can open the creator,
 * change everything and cancel without touching the running game. "Finish"
 * calls `createCharacter(draft)` in the game store.
 *
 * The last used name/profile name and appearance are kept in localStorage so a
 * second character (or a new game) starts from what the player already liked.
 */
export const TRAIT_LIMIT = 5;

export interface CreatorState {
  step: number;
  profileName: string;
  name: string;
  age: number;
  gender: Gender;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
  /** Highlighted error field, set when the player tries to advance too early. */
  error: 'name' | 'traits' | 'aspiration' | null;

  start: (options?: Partial<Pick<CreatorState, 'appearance' | 'name' | 'profileName'>>) => void;
  setStep: (step: number) => void;
  next: () => boolean;
  back: () => void;
  patch: (patch: Partial<Omit<CreatorState, 'patch' | 'start' | 'setStep'>>) => void;
  toggleTrait: (traitId: string) => void;
  setAspiration: (aspiration: string) => void;
  setAppearance: (patch: Partial<Appearance>) => void;
  reset: () => void;
}

export const TOTAL_CREATOR_STEPS = 5;

interface StoredDraft {
  appearance?: Appearance;
  name?: string;
  profileName?: string;
}

function readDraft(): StoredDraft {
  try {
    const raw = storage.readCreatorDraft();
    if (!raw) return {};
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return {};
  }
}

function saveDraft(draft: StoredDraft): void {
  try {
    storage.writeCreatorDraft(JSON.stringify(draft));
  } catch {
    // Draft is a convenience; failing to store it must never block creating.
  }
}

/** A random friend code is generated here so the profile is complete upfront. */
export const PENDING_FRIEND_CODE = createFriendCode();

export const useCreatorStore = create<CreatorState>((set, get) => ({
  step: 0,
  profileName: 'Jogador',
  name: '',
  age: 24,
  gender: 'feminine',
  appearance: { ...DEFAULT_APPEARANCE },
  traits: [],
  aspiration: '',
  error: null,

  start: (options) => {
    const stored = readDraft();
    set({
      step: 0,
      profileName: options?.profileName ?? stored.profileName ?? 'Jogador',
      name: options?.name ?? stored.name ?? '',
      age: 24,
      gender: 'feminine',
      appearance: options?.appearance ?? stored.appearance ?? { ...DEFAULT_APPEARANCE },
      traits: [],
      aspiration: '',
      error: null,
    });
  },

  setStep: (step) => set({ step: Math.max(0, Math.min(TOTAL_CREATOR_STEPS - 1, step)), error: null }),

  next: () => {
    const state = get();
    if (state.step === 0) {
      const name = state.name.trim();
      if (name.length < 2) {
        set({ error: 'name' });
        return false;
      }
    }
    // Step order: 0 name, 1 body, 2 style, 3 traits, 4 aspiration.
    // Moving on from the traits step requires exactly TRAIT_LIMIT picks; the
    // aspiration is validated by `finish`, which is the only way out of step 4.
    if (state.step === 3 && state.traits.length !== TRAIT_LIMIT) {
      set({ error: 'traits' });
      return false;
    }
    set({ step: Math.min(TOTAL_CREATOR_STEPS - 1, state.step + 1), error: null });
    return true;
  },

  back: () => set((state) => ({ step: Math.max(0, state.step - 1), error: null })),

  patch: (patch) => set({ ...patch, error: null }),

  toggleTrait: (traitId) => {
    const { traits } = get();
    if (traits.includes(traitId)) {
      set({ traits: traits.filter((trait) => trait !== traitId), error: null });
      return;
    }
    if (traits.length >= TRAIT_LIMIT) return;
    set({ traits: [...traits, traitId], error: null });
  },

  setAspiration: (aspiration) => set({ aspiration, error: null }),

  setAppearance: (patch) => set((state) => ({ appearance: { ...state.appearance, ...patch } })),

  reset: () => {
    set({
      step: 0,
      name: '',
      age: 24,
      gender: 'feminine',
      appearance: { ...DEFAULT_APPEARANCE },
      traits: [],
      aspiration: '',
      error: null,
    });
  },
}));

/** Persists the parts of the draft worth remembering between sessions. */
export function rememberDraft(state: Pick<CreatorState, 'appearance' | 'name' | 'profileName'>): void {
  saveDraft({ appearance: state.appearance, name: state.name, profileName: state.profileName });
}
