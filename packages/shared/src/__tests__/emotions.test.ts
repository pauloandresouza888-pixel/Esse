import { describe, expect, it } from 'vitest';
import {
  EMOTION_MINUTES,
  MAX_MEMORIES,
  applyEmotionMood,
  currentEmotion,
  emotionForInteraction,
  emotionFromNeeds,
  remember,
  type ActiveEmotion,
  type Memory,
} from '../emotions';
import { createNeeds } from '../needs';
import { advanceWorld } from '../simulation';
import { createClock } from '../clock';
import { beginAction } from '../simulation';

const DAY = 1_440_000; // 24 real minutes
const HOUR = 3_600_000;

function worldAt(hour: number) {
  return { clock: { ...createClock(1440), totalMs: hour * HOUR }, needs: createNeeds(), action: null };
}

describe('emotions from needs', () => {
  it('maps a critical need to a readable emotion', () => {
    expect(emotionFromNeeds(createNeeds({ bladder: 5 }))).toBe('angry');
    expect(emotionFromNeeds(createNeeds({ hunger: 5 }))).toBe('stressed');
    expect(emotionFromNeeds(createNeeds({ energy: 5 }))).toBe('tired');
    expect(emotionFromNeeds(createNeeds({ hygiene: 5 }))).toBe('stressed');
    expect(emotionFromNeeds(createNeeds({ mood: 100 }))).toBe('happy');
  });

  it('falls back to needs when there is no active memory emotion', () => {
    const needs = createNeeds({ energy: 10 });
    const emotion = currentEmotion(needs, [], 0);
    expect(emotion.id).toBe('tired');
    expect(emotion.reason).toBe('needs');
  });

  it('keeps memory emotions only while they last', () => {
    const emotions: ActiveEmotion[] = [{ id: 'cozy', untilMs: 1000, reason: 'relax' }];
    expect(currentEmotion(createNeeds(), emotions, 500).id).toBe('cozy');
    expect(currentEmotion(createNeeds(), emotions, 1500).id).toBe('happy');
  });
});

describe('memories', () => {
  it('caps the memory list and keeps the newest', () => {
    let memories: Memory[] = [];
    let emotions: ActiveEmotion[] = [];
    for (let i = 0; i < MAX_MEMORIES + 5; i += 1) {
      const result = remember(
        memories,
        emotions,
        { interactionId: 'eat', atMs: i * 1000, mood: 0, emotion: 'content' },
        i * 1000,
        DAY,
      );
      memories = result.memories;
      emotions = result.emotions;
    }
    expect(memories).toHaveLength(MAX_MEMORIES);
    expect(memories.at(-1)?.atMs).toBe((MAX_MEMORIES + 4) * 1000);
  });

  it('refreshes the same emotion instead of stacking it', () => {
    const first = remember([], [], { interactionId: 'watch', atMs: 0, mood: 0, emotion: 'happy' }, 0, DAY);
    const second = remember(
      first.memories,
      first.emotions,
      { interactionId: 'petCat', atMs: 1000, mood: 0, emotion: 'happy' },
      1000,
      DAY,
    );
    expect(second.emotions.filter((emotion) => emotion.id === 'happy')).toHaveLength(1);
    expect(second.emotions[0]!.reason).toBe('petCat');
  });

  it('emotions push the mood around the needs average', () => {
    const needs = createNeeds({ mood: 50 });
    const cozy: ActiveEmotion[] = [{ id: 'cozy', untilMs: DAY, reason: 'relax' }];
    const afterHour = applyEmotionMood(needs, cozy, 0, 1);
    expect(afterHour.mood).toBeGreaterThan(50);
    const stressed: ActiveEmotion[] = [{ id: 'stressed', untilMs: DAY, reason: 'work' }];
    expect(applyEmotionMood(needs, stressed, 0, 1).mood).toBeLessThan(50);
  });
});

describe('emotions in the simulation', () => {
  it('finishing an action leaves a memory and an emotion', () => {
    const world = worldAt(10);
    const begun = beginAction(world, 'fridge', 'eat');
    expect(begun).not.toBeNull();
    let current = {
      ...world,
      action: begun!.action,
      emotions: [] as ActiveEmotion[],
      memories: [] as Memory[],
    };
    // Run until the meal is over.
    for (let i = 0; i < 400 && current.action; i += 1) {
      current = advanceWorld(current, 500).world;
    }
    expect(current.action).toBeNull();
    expect(current.memories?.length).toBe(1);
    expect(current.memories?.[0]?.interactionId).toBe('eat');
    expect(current.emotions?.some((emotion) => emotion.id === 'content')).toBe(true);
    expect(current.emotions?.[0]?.untilMs).toBeGreaterThan(current.clock.totalMs);
  });

  it('knows which emotion every interaction grants', () => {
    expect(emotionForInteraction('shower')).toBe('content');
    expect(emotionForInteraction('watch')).toBe('happy');
    expect(emotionForInteraction('sleep')).toBe('energized');
    expect(EMOTION_MINUTES).toBeGreaterThan(30);
  });
});
