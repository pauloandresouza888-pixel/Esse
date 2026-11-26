import { create } from 'zustand';

/**
 * Transient UI state: toasts, sheets and the offline indicator.
 * Kept separate from `gameStore` so re-rendering a toast never touches the
 * persistent save.
 */
export type ToastTone = 'info' | 'success' | 'warning';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** Optional action label + callback, used by the "new version" toast. */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface UiState {
  toasts: Toast[];
  isOffline: boolean;
  pushToast: (toast: Omit<Toast, 'id'>) => number;
  dismissToast: (id: number) => void;
  setOffline: (offline: boolean) => void;
}

let nextId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,

  pushToast: (toast) => {
    const id = nextId++;
    // Never stack more than three toasts on a small screen.
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
    return id;
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  setOffline: (offline) => set({ isOffline: offline }),
}));

/** Non-hook accessor for code outside React (Phaser scenes, platform hooks). */
export function toast(message: string, tone: ToastTone = 'info'): void {
  useUiStore.getState().pushToast({ message, tone });
}
