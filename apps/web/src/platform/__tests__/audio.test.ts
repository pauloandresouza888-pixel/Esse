import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hapticTap, sound } from '../audio';
import { storage } from '@/platform/storage';
import { seedSave } from '@/test/render';

/**
 * Audio must never break the game. jsdom has no Web Audio API, which is the
 * worst case (old browsers, tests): every call has to be a silent no-op.
 */
beforeEach(() => {
  storage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  storage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('audio engine', () => {
  it('is a silent no-op without Web Audio and never throws', () => {
    expect(() => {
      sound.unlock();
      sound.applySettings();
      sound.music(true);
      const names = [
        'tap',
        'step',
        'eat',
        'shower',
        'sleep',
        'wake',
        'complete',
        'alert',
        'tutorial',
        'pause',
        'resume',
      ] as const;
      for (const name of names) sound.play(name);
      sound.stop();
    }).not.toThrow();
  });

  it('respects the haptics setting when vibrating', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    seedSave({ settings: { haptics: true } });
    hapticTap();
    expect(vibrate).toHaveBeenCalledTimes(1);

    seedSave({ settings: { haptics: false } });
    hapticTap();
    // Still one call: the second tap is muted by the setting.
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
