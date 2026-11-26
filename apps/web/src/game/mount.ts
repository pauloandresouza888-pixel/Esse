/**
 * Phaser bootstrap.
 *
 * This module is imported dynamically by `GameCanvas` so the ~1 MB engine is not
 * part of the first paint. It exposes a tiny imperative handle (no React inside)
 * and translates Phaser scene events into plain callbacks.
 */
import type Phaser from 'phaser';
import { readClock, type DayPhase, type InteractionId } from '@vida/shared';
import { createGame, RoomScene } from './scenes/RoomScene';
import { gameEvents } from './events';
import type { ClockSnapshot, ObjectTapPayload, RoomSceneData } from './sceneData';

export type { ClockSnapshot, ObjectTapPayload, RoomSceneData } from './sceneData';

export interface GameHandle {
  destroy: () => void;
  onReady: (callback: () => void) => void;
  onObjectTap: (callback: (payload: ObjectTapPayload) => void) => void;
  onFloorTap: (callback: (cell: { x: number; y: number }) => void) => void;
  onWalkStarted: (callback: (cell: { x: number; y: number }) => void) => void;
  onWalkEnded: (callback: (cell: { x: number; y: number }) => void) => void;
  onClockChange: (callback: (reading: ClockSnapshot) => void) => void;
  /** Pauses the simulation (clock + tweens) without stopping rendering. */
  setPaused: (paused: boolean) => void;
  /** Pushes the authoritative game time into the scene (sun, sky, lamps). */
  setClockMs: (totalMs: number) => void;
  /** Walks the character to a cell; resolves false when unreachable. */
  walkTo: (cell: { x: number; y: number }, onArrive?: () => void) => boolean;
  /** Plays the visual part of an interaction. */
  playAction: (itemId: string, interactionId: InteractionId, durationMs: number) => void;
  stopAction: () => void;
  /** Emits a tap on an object, as if the player had touched it. */
  tapObjectById: (id: string) => boolean;
  game: Phaser.Game;
}

/** Boots Phaser inside `parent` and resolves when the scene is created. */
export function mountGame(parent: HTMLElement, data: RoomSceneData): Promise<GameHandle> {
  return new Promise((resolve) => {
    const game = createGame(parent, data, data.quality);

    const unsubscribers: (() => void)[] = [];
    const readyCallbacks: (() => void)[] = [];
    const tapCallbacks: ((payload: ObjectTapPayload) => void)[] = [];
    const floorCallbacks: ((cell: { x: number; y: number }) => void)[] = [];
    const walkStartCallbacks: ((cell: { x: number; y: number }) => void)[] = [];
    const walkEndCallbacks: ((cell: { x: number; y: number }) => void)[] = [];
    const clockCallbacks: ((reading: ClockSnapshot) => void)[] = [];
    let disposed = false;

    const scene = (): RoomScene | null =>
      (game.scene.getScene(RoomScene.KEY) as RoomScene | null) ?? null;

    const handle: GameHandle = {
      game,
      destroy: () => {
        disposed = true;
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        game.destroy(true, false);
        gameEvents.clear();
      },
      onReady: (callback) => {
        if (game.scene.isActive(RoomScene.KEY)) callback();
        readyCallbacks.push(callback);
      },
      onObjectTap: (callback) => {
        tapCallbacks.push(callback);
      },
      onFloorTap: (callback) => {
        floorCallbacks.push(callback);
      },
      onWalkStarted: (callback) => {
        walkStartCallbacks.push(callback);
      },
      onWalkEnded: (callback) => {
        walkEndCallbacks.push(callback);
      },
      onClockChange: (callback) => {
        clockCallbacks.push(callback);
      },
      setPaused: (paused) => {
        scene()?.setPaused(paused);
      },
      setClockMs: (totalMs) => {
        scene()?.setClockMs(totalMs);
      },
      walkTo: (cell, onArrive) => scene()?.walkTo(cell, onArrive) ?? false,
      playAction: (itemId, interactionId, durationMs) => {
        scene()?.playAction(itemId, interactionId, durationMs);
      },
      stopAction: () => {
        scene()?.stopAction();
      },
      tapObjectById: (id) => scene()?.tapObjectById(id) ?? false,
    };

    unsubscribers.push(
      gameEvents.on('ready', () => {
        readyCallbacks.forEach((callback) => callback());
      }),
      gameEvents.on('object-tapped', (payload) => {
        tapCallbacks.forEach((callback) => callback(payload));
      }),
      gameEvents.on('floor-tapped', ({ cell }) => {
        floorCallbacks.forEach((callback) => callback(cell));
      }),
      gameEvents.on('walk-started', ({ cell }) => {
        walkStartCallbacks.forEach((callback) => callback(cell));
      }),
      gameEvents.on('walk-ended', ({ cell }) => {
        walkEndCallbacks.forEach((callback) => callback(cell));
      }),
      gameEvents.on('hour-changed', ({ hour, day, phase, minute, dayProgress }) => {
        const reading: ClockSnapshot = {
          hour,
          minute,
          day,
          phase: phase as DayPhase,
          label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          dayProgress,
        };
        clockCallbacks.forEach((callback) => callback(reading));
      }),
    );

    // Resolve as soon as the Game object exists, so React can show the HUD while
    // the scene rasterizes its SVG textures.
    game.events.once('ready', () => {
      if (!disposed) resolve(handle);
    });
    setTimeout(() => {
      if (!disposed) resolve(handle);
    }, 0);
  });
}

/** Utility used by the Play screen HUD before the scene reports its first hour. */
export function clockSnapshotFrom(totalMs: number, dayLengthMs: number): ClockSnapshot {
  const reading = readClock({ totalMs, speed: 1, dayLengthMs });
  return {
    hour: reading.hour,
    minute: reading.minute,
    day: reading.day,
    phase: reading.phase,
    label: reading.label,
    dayProgress: reading.dayProgress,
  };
}
