/**
 * Bridge between Phaser (imperative, canvas) and React (declarative, DOM).
 *
 * The scene never imports stores or React: it publishes plain events, and the
 * React wrapper decides what to do. This keeps the game loop free of React
 * re-renders, which is the difference between 60 FPS and 20 FPS on a phone.
 */
import type { ObjectTapPayload } from './sceneData';

export type GameEventMap = {
  /** Scene finished booting and the room is visible. */
  ready: { ts: number };
  /** The player tapped an interactive object. */
  'object-tapped': ObjectTapPayload;
  /** The player tapped the floor (tap-to-move). */
  'floor-tapped': { cell: { x: number; y: number } };
  /** The character arrived at its destination. */
  'walk-ended': { cell: { x: number; y: number } };
  /** The character started walking (tutorial step 1). */
  'walk-started': { cell: { x: number; y: number } };
  /** In-game hour changed (used to update the HUD clock). */
  'hour-changed': {
    hour: number;
    minute: number;
    day: number;
    phase: string;
    dayProgress: number;
  };
  /** Performance probe: recent FPS, shown in debug mode only. */
  'fps-sample': { fps: number };
};

type Handler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

class TypedEmitter {
  private handlers = new Map<keyof GameEventMap, Set<(payload: never) => void>>();

  on<K extends keyof GameEventMap>(event: K, handler: Handler<K>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler as (payload: never) => void);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => {
      (handler as Handler<K>)(payload);
    });
  }

  /** Removes every listener (used when the game screen unmounts). */
  clear(): void {
    this.handlers.clear();
  }
}

export const gameEvents = new TypedEmitter();
