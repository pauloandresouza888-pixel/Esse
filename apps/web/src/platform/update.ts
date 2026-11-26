/**
 * Service worker update handling (vite-plugin-pwa with registerType: 'prompt').
 *
 * `virtual:pwa-register` gives us `updateServiceWorker(true)`, which activates
 * the waiting worker and reloads the page. We only reload on user action so a
 * player never loses a half-built room.
 */
import { registerSW } from 'virtual:pwa-register';

let updateAvailable = false;
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<(available: boolean) => void>();

export function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      listeners.forEach((listener) => listener(true));
    },
    onOfflineReady() {
      // Nothing to do: the app works offline. Useful for debugging in the console.
      console.info('[pwa] app ready for offline use');
    },
  });
  applyUpdate = updateSW;
}

export function subscribeUpdateAvailability(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  listener(updateAvailable);
  return () => {
    listeners.delete(listener);
  };
}

export async function applyServiceWorkerUpdate(): Promise<void> {
  updateAvailable = false;
  listeners.forEach((listener) => listener(false));
  await applyUpdate?.(true);
}
