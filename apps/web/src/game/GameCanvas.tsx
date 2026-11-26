import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Appearance, InteractionId, QualityLevel, Settings } from '@vida/shared';
import type { ClockSnapshot, ObjectTapPayload } from './sceneData';
import { roomSceneData } from './sceneData';
import type { GameHandle } from './mount';
import styles from './GameCanvas.module.css';

export interface GameCanvasProps {
  appearance: Appearance;
  quality: QualityLevel;
  settings: Pick<Settings, 'reducedMotion'>;
  clockTotalMs: number;
  dayLengthMs: number;
  characterCell: { x: number; y: number };
  /** When true the simulation is paused (pause button). */
  paused?: boolean;
  onReady?: (handle: GameHandle) => void;
  onObjectTap?: (payload: ObjectTapPayload) => void;
  onFloorTap?: (cell: { x: number; y: number }) => void;
  onWalkStarted?: (cell: { x: number; y: number }) => void;
  onWalkEnded?: (cell: { x: number; y: number }) => void;
  onClockChange?: (reading: ClockSnapshot) => void;
}

/**
 * React wrapper around Phaser.
 *
 * Why this file is the only place that touches Phaser from React:
 * - the engine instance survives React re-renders (it lives in a ref);
 * - the game is created *after* the first paint, so the HUD appears instantly;
 * - Phaser is loaded with a dynamic import (`mount.ts`), keeping the initial
 *   bundle small;
 * - events flow through the typed bus, never through React state per frame.
 *
 * The parent receives the imperative `GameHandle` through `onReady`, which is
 * how the Play screen tells the character to walk or plays an animation.
 */
export function GameCanvas({
  appearance,
  quality,
  settings,
  clockTotalMs,
  dayLengthMs,
  characterCell,
  paused = false,
  onReady,
  onObjectTap,
  onFloorTap,
  onWalkStarted,
  onWalkEnded,
  onClockChange,
}: GameCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  // Keep callbacks in refs so the boot effect never restarts the engine when a
  // parent re-renders with a new inline function.
  const callbacks = useRef({
    onReady,
    onObjectTap,
    onFloorTap,
    onWalkStarted,
    onWalkEnded,
    onClockChange,
  });
  callbacks.current = {
    onReady,
    onObjectTap,
    onFloorTap,
    onWalkStarted,
    onWalkEnded,
    onClockChange,
  };

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return undefined;
    if (import.meta.env.MODE === 'test') {
      // jsdom cannot render WebGL/Canvas; tests render the HUD without the engine.
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const { mountGame } = await import('./mount');
        if (cancelled) return;
        const handle = await mountGame(
          container,
          roomSceneData(appearance, quality, settings, clockTotalMs, dayLengthMs, characterCell),
        );
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        handle.onReady(() => {
          setReady(true);
          callbacks.current.onReady?.(handle);
        });
        handle.onObjectTap((payload) => callbacks.current.onObjectTap?.(payload));
        handle.onFloorTap((cell) => callbacks.current.onFloorTap?.(cell));
        handle.onWalkStarted((cell) => callbacks.current.onWalkStarted?.(cell));
        handle.onWalkEnded((cell) => callbacks.current.onWalkEnded?.(cell));
        handle.onClockChange((reading) => callbacks.current.onClockChange?.(reading));
      } catch (caught) {
        console.error('[game] failed to boot', caught);
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // The engine is created once per game screen visit. Appearance and clock
    // are read at boot; live updates go through the imperative handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.canvas} data-testid="game-canvas" />
      {!ready && !error ? (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <span>{t('boot.loading')}</span>
        </div>
      ) : null}
      {error ? (
        <div className={styles.error} role="alert">
          <p>{t('errors.phaser')}</p>
          <button className={styles.retry} onClick={() => window.location.reload()}>
            {t('errors.retry')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Interaction helper shared by the HUD and the tutorial (kept Phaser-free). */
export type { InteractionId };
