import type { OrientationPreference } from '@vida/shared';

/**
 * Orientation preference.
 *
 * Browsers only allow locking the orientation in fullscreen / installed mode,
 * and only on some devices. We try, and silently fall back to a CSS hint.
 */
export interface ScreenOrientationWithLock extends ScreenOrientation {
  lock?: (orientation: 'portrait' | 'landscape') => Promise<void>;
}

export async function applyOrientation(preference: OrientationPreference): Promise<boolean> {
  const orientation = screen.orientation as ScreenOrientationWithLock | undefined;
  if (!orientation || typeof orientation.lock !== 'function') return false;
  try {
    if (preference === 'auto') {
      orientation.unlock?.();
      return true;
    }
    await orientation.lock(preference);
    return true;
  } catch {
    return false;
  }
}

export function currentIsLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}
