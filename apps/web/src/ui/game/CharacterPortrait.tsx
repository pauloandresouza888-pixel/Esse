import { useMemo } from 'react';
import { characterSvg, svgToDataUri } from '@/game/art/characterSvg';
import type { Appearance } from '@vida/shared';
import styles from './CharacterPortrait.module.css';

interface CharacterPortraitProps {
  appearance: Appearance;
  name: string;
  size?: number;
}

/**
 * Round avatar used in the HUD.
 *
 * It reuses the exact SVG that Phaser rasterizes for the room, so the face in
 * the corner is always the same character — no separate "portrait art" to keep
 * in sync when the creator (Phase 1) changes hair or clothes.
 */
export function CharacterPortrait({ appearance, name, size = 54 }: CharacterPortraitProps) {
  const uri = useMemo(
    () => svgToDataUri(characterSvg(appearance, { mode: 'bust', mood: 'happy' })),
    [appearance],
  );
  return (
    <div
      className={styles.portrait}
      style={{ width: size, height: size }}
      role="img"
      aria-label={name}
      data-testid="character-portrait"
    >
      <img src={uri} alt="" width={size} height={size} />
    </div>
  );
}
