import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_APPEARANCE } from '@vida/shared';
import { roomSceneData } from '../sceneData';

describe('roomSceneData', () => {
  it('packs the save values into the scene payload', () => {
    const data = roomSceneData(
      DEFAULT_APPEARANCE,
      'medium',
      { reducedMotion: true },
      3_600_000,
      60_000,
    );
    expect(data).toEqual({
      appearance: DEFAULT_APPEARANCE,
      quality: 'medium',
      reducedMotion: true,
      clockTotalMs: 3_600_000,
      dayLengthMs: 60_000,
      characterCell: { x: 11, y: 7 },
      placedFurniture: [],
    });
  });

  it('does not depend on global settings objects', () => {
    const data = roomSceneData(DEFAULT_APPEARANCE, 'high', DEFAULT_SETTINGS, 0, 1_440_000);
    expect(data.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
    expect(data.quality).toBe('high');
  });
});
