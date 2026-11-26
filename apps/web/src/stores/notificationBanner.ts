import { create } from 'zustand';

/**
 * One-slot banner used by the game screen for contextual tips (e.g. "toca na
 * casa"). It replaces itself instead of stacking, so the play area stays clean.
 */
interface BannerState {
  message: string | null;
  tone: 'info' | 'success';
  show: (message: string, tone?: 'info' | 'success') => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useBannerStore = create<BannerState>((set) => ({
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, tone });
    hideTimer = setTimeout(() => set({ message: null }), 4200);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null });
  },
}));
