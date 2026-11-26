/**
 * Device and browser capabilities.
 *
 * Detections are conservative: a wrong "iPhone" guess only affects a hint text,
 * but a wrong "low-end device" guess would lower the graphics quality for
 * everyone, so we prefer to under-detect.
 */
import type { QualityLevel } from '@vida/shared';

export interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isStandalone: boolean;
  supportsVibrate: boolean;
  hardwareConcurrency: number;
  /** Suggested initial quality, before the player overrides it. */
  suggestedQuality: QualityLevel;
}

export function readDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isStandalone: false,
      supportsVibrate: false,
      hardwareConcurrency: 4,
      suggestedQuality: 'high',
    };
  }

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const isStandalone =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  let suggestedQuality: QualityLevel = 'high';
  if (hardwareConcurrency <= 4 || memory <= 2) suggestedQuality = 'medium';
  if (hardwareConcurrency <= 2) suggestedQuality = 'low';

  return {
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    supportsVibrate: typeof navigator.vibrate === 'function',
    hardwareConcurrency,
    suggestedQuality,
  };
}

/** Light haptic click. Silently does nothing where vibration is unsupported. */
export function vibrate(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ignored: vibration is a nice-to-have.
  }
}

/** Network status is mirrored in the UI store (`useUiStore.isOffline`). */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
