/**
 * PWA install flow.
 *
 * Chrome/Edge fire `beforeinstallprompt`; we keep the event and let the game
 * show its own card at a good moment (never a modal on first paint). iOS has no
 * such event, so the UI falls back to a short instruction.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
  });
}

export function subscribeInstallAvailability(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  listener(deferredPrompt !== null);
  return () => {
    listeners.delete(listener);
  };
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** Returns the user's decision, or null when the browser cannot prompt. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) return null;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    return choice.outcome;
  } finally {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
  }
}
