/**
 * Emotions and memories.
 *
 * The seven needs are slow variables (they drift over hours). Emotions are the
 * fast one: they last minutes, colour the portrait and the thought bubble, and
 * make the same day feel different. They are also the bridge to the AI — a
 * stressed character chooses comfort over chores.
 *
 * Everything here is pure and seeded, so a test can replay a day and get the
 * same emotions.
 */
import { clampNeed, type Needs } from './needs';
import type { InteractionId } from './content';

export const EMOTIONS = [
  'happy',
  'content',
  'energized',
  'tired',
  'stressed',
  'sad',
  'angry',
  'sick',
  'inspired',
  'cozy',
] as const;

export type EmotionId = (typeof EMOTIONS)[number];

export type EmotionTone = 'positive' | 'neutral' | 'negative';

export interface EmotionDefinition {
  id: EmotionId;
  tone: EmotionTone;
  emoji: string;
  /** Points of mood added while the emotion is active (per game hour). */
  moodPerHour: number;
  /** AI weight multiplier: how much this emotion biases its decisions. */
  focus: 'comfort' | 'energy' | 'fun' | 'social' | 'work' | 'rest' | 'none';
}

export const EMOTION_DEFINITIONS: Record<EmotionId, EmotionDefinition> = {
  happy: { id: 'happy', tone: 'positive', emoji: '😄', moodPerHour: 1.5, focus: 'fun' },
  content: { id: 'content', tone: 'positive', emoji: '🙂', moodPerHour: 0.6, focus: 'none' },
  energized: { id: 'energized', tone: 'positive', emoji: '⚡', moodPerHour: 0.8, focus: 'work' },
  tired: { id: 'tired', tone: 'negative', emoji: '😴', moodPerHour: -0.8, focus: 'rest' },
  stressed: { id: 'stressed', tone: 'negative', emoji: '😰', moodPerHour: -1.2, focus: 'comfort' },
  sad: { id: 'sad', tone: 'negative', emoji: '😢', moodPerHour: -1, focus: 'social' },
  angry: { id: 'angry', tone: 'negative', emoji: '😠', moodPerHour: -1.4, focus: 'none' },
  sick: { id: 'sick', tone: 'negative', emoji: '🤒', moodPerHour: -1.6, focus: 'rest' },
  inspired: { id: 'inspired', tone: 'positive', emoji: '✨', moodPerHour: 1.1, focus: 'work' },
  cozy: { id: 'cozy', tone: 'positive', emoji: '🧸', moodPerHour: 0.9, focus: 'comfort' },
};

export interface ActiveEmotion {
  id: EmotionId;
  /** In-game ms when it fades (long past = forever until replaced). */
  untilMs: number;
  /** Short reason, used by the UI tooltip and the tests. */
  reason: string;
}

export interface Memory {
  /** Interaction that generated it ("eat", "shower"). */
  interactionId: InteractionId | 'work' | 'promotion' | 'missedShift' | 'purchase';
  /** In-game ms when it happened. */
  atMs: number;
  /** Mood delta applied immediately (positive or negative). */
  mood: number;
  /** Emotion it grants, if any. */
  emotion?: EmotionId;
}

/** Max stored memories: a small ring buffer, the last 12 are enough. */
export const MAX_MEMORIES = 12;

/** Game minutes an emotion stays active by default. */
export const EMOTION_MINUTES = 90;

/**
 * Derives the emotion the needs imply, ignoring memories. This is the "base
 * mood" the player can always understand: no sleep ⇒ tired, empty stomach ⇒
 * sad, dirty ⇒ stressed.
 */
export function emotionFromNeeds(needs: Needs): EmotionId {
  if (needs.bladder < 12) return 'angry';
  if (needs.hunger < 12) return 'stressed';
  if (needs.energy < 15) return 'tired';
  if (needs.hygiene < 15) return 'stressed';
  const average = (needs.hunger + needs.energy + needs.hygiene + needs.bladder + needs.fun + needs.social) / 6;
  if (average > 85) return 'happy';
  if (average > 65) return 'content';
  if (needs.fun < 25) return 'sad';
  return 'content';
}

/** Score used to choose between several emotions (higher wins). */
function emotionPriority(emotion: ActiveEmotion, nowMs: number): number {
  const definition = EMOTION_DEFINITIONS[emotion.id];
  const remaining = emotion.untilMs - nowMs;
  // Active emotions beat expired ones; stronger definitions beat weaker ones.
  return (remaining > 0 ? 1000 : 0) + Math.abs(definition.moodPerHour) * 10;
}

/** Current emotion: the strongest active memory-driven one, else the needs'. */
export function currentEmotion(
  needs: Needs,
  emotions: readonly ActiveEmotion[],
  nowMs: number,
): ActiveEmotion {
  const active = emotions.filter((emotion) => emotion.untilMs > nowMs);
  if (active.length === 0) {
    return { id: emotionFromNeeds(needs), untilMs: nowMs, reason: 'needs' };
  }
  const best = [...active].sort((a, b) => emotionPriority(b, nowMs) - emotionPriority(a, nowMs))[0]!;
  return best;
}

/** Adds a memory and returns the emotions list with the new one applied. */
export function remember(
  memories: readonly Memory[],
  emotions: readonly ActiveEmotion[],
  memory: Memory,
  nowMs: number,
  dayLengthMs: number,
): { memories: Memory[]; emotions: ActiveEmotion[] } {
  const nextMemories = [...memories, memory].slice(-MAX_MEMORIES);
  if (!memory.emotion) return { memories: nextMemories, emotions: [...emotions] };
  const definition = EMOTION_DEFINITIONS[memory.emotion];
  const durationMs = (EMOTION_MINUTES / (24 * 60)) * dayLengthMs;
  const nextEmotion: ActiveEmotion = {
    id: memory.emotion,
    untilMs: nowMs + durationMs,
    reason: memory.interactionId,
  };
  // Same emotion refreshes instead of stacking; different ones coexist (the UI
  // shows the strongest) and the weakest fade out first.
  const kept = emotions.filter((emotion) => emotion.id !== memory.emotion && emotion.untilMs > nowMs);
  const emotionsNext = [...kept, nextEmotion]
    .sort((a, b) => b.untilMs - a.untilMs)
    .slice(0, 3);
  void definition;
  return { memories: nextMemories, emotions: emotionsNext };
}

/**
 * Emotion granted by finishing an interaction. Kept in one table so designers
 * can tune it without touching the simulation.
 */
export function emotionForInteraction(interactionId: InteractionId): EmotionId | null {
  switch (interactionId) {
    case 'eat':
    case 'cook':
      return 'content';
    case 'drinkWater':
      return 'energized';
    case 'sleep':
    case 'nap':
      return 'energized';
    case 'shower':
    case 'washHands':
      return 'content';
    case 'toilet':
      return 'content';
    case 'relax':
    case 'sit':
    case 'coffee':
      return 'cozy';
    case 'watch':
    case 'listenMusic':
    case 'petCat':
    case 'stargaze':
      return 'happy';
    case 'paint':
    case 'read':
      return 'inspired';
    case 'code':
      return 'inspired';
    case 'exercise':
      return 'energized';
    default:
      return null;
  }
}

/**
 * Mood drift caused by the active emotion, in points per game hour.
 * The needs already drive mood towards the average; emotions push it around
 * that average, which is what makes a "cozy" evening feel different.
 */
export function emotionMoodPerHour(emotions: readonly ActiveEmotion[], nowMs: number): number {
  const active = emotions.filter((emotion) => emotion.untilMs > nowMs);
  if (active.length === 0) return 0;
  return active.reduce((total, emotion) => total + EMOTION_DEFINITIONS[emotion.id].moodPerHour, 0);
}

/** Applies emotion effects to the mood need. */
export function applyEmotionMood(
  needs: Needs,
  emotions: readonly ActiveEmotion[],
  nowMs: number,
  gameHours: number,
): Needs {
  if (gameHours <= 0) return needs;
  const delta = emotionMoodPerHour(emotions, nowMs) * gameHours;
  if (delta === 0) return needs;
  return { ...needs, mood: clampNeed(needs.mood + delta) };
}

/** Human-readable summary for the HUD ("cócegas de felicidade"). */
export function emotionKey(emotion: EmotionId): string {
  return `emotions.${emotion}`;
}
