/**
 * Guided tutorial rules.
 *
 * The tutorial is a tiny state machine driven by what actually happened in the
 * world (the player walked, finished an interaction, woke up). Keeping it pure
 * and signal-based means it can be replayed in tests and, later, validated by
 * the server — and the player never gets stuck because the UI "knows" the step
 * only in React state: the step lives in the save.
 */
import { TUTORIAL_STEPS, type TutorialStepDefinition } from './content';
import type { Profile } from './save';

export type TutorialSignal =
  | { type: 'walked' }
  | { type: 'action-completed'; itemId: string }
  | { type: 'woke-up' };

/** Index of the tutorial step a signal satisfies, or -1. */
export function tutorialStepForSignal(signal: TutorialSignal): number {
  return TUTORIAL_STEPS.findIndex((step) => {
    switch (step.id) {
      case 'move':
        return signal.type === 'walked';
      case 'eat':
        return signal.type === 'action-completed' && signal.itemId === 'fridge';
      case 'shower':
        return signal.type === 'action-completed' && signal.itemId === 'shower';
      case 'toilet':
        return signal.type === 'action-completed' && signal.itemId === 'toilet';
      case 'sleep':
        return (
          signal.type === 'woke-up' ||
          (signal.type === 'action-completed' && signal.itemId === 'bed')
        );
      default:
        return false;
    }
  });
}

/**
 * Applies a signal to the profile.
 *
 * Out-of-order actions are accepted: if the player eats before the "walk" step
 * is marked, we jump forward instead of asking them to repeat it. A signal for
 * an already completed step changes nothing (returns the same object).
 */
export function applyTutorialSignal(profile: Profile, signal: TutorialSignal): Profile {
  if (profile.tutorialDone) return profile;
  const index = tutorialStepForSignal(signal);
  if (index < 0) return profile;
  const nextStep = Math.max(profile.tutorialStep, index + 1);
  if (nextStep === profile.tutorialStep) return profile;
  const done = nextStep >= TUTORIAL_STEPS.length;
  return { ...profile, tutorialStep: nextStep, tutorialDone: done };
}

/** Current step definition (null when the tutorial is done). */
export function currentTutorialStep(profile: Profile): TutorialStepDefinition | null {
  if (profile.tutorialDone) return null;
  return TUTORIAL_STEPS[profile.tutorialStep] ?? null;
}

/** Marks the tutorial as finished (the "skip" button). */
export function finishTutorial(profile: Profile): Profile {
  if (profile.tutorialDone) return profile;
  return { ...profile, tutorialStep: TUTORIAL_STEPS.length, tutorialDone: true };
}
