import { useTranslation } from 'react-i18next';
import { TUTORIAL_STEPS, type Profile } from '@vida/shared';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import styles from './TutorialCoach.module.css';

interface TutorialCoachProps {
  profile: Profile;
  /** Called when the player taps the action button of the step. */
  onFocusObject?: (itemId: string) => void;
  onSkip: () => void;
}

/**
 * Guided tutorial (5 short steps).
 *
 * The step comes from the save (`profile.tutorialStep`) and advances only when
 * the player actually does the thing — walking, eating, showering, using the
 * toilet and sleeping. The bubble is small and sits above the action bar so it
 * never covers the room the player is looking at.
 */
export function TutorialCoach({ profile, onFocusObject, onSkip }: TutorialCoachProps) {
  const { t } = useTranslation();
  if (profile.tutorialDone) return null;
  const step = TUTORIAL_STEPS[profile.tutorialStep];
  if (!step) return null;
  const index = profile.tutorialStep + 1;
  const total = TUTORIAL_STEPS.length;

  return (
    <div className={styles.coach} role="status" aria-live="polite">
      <div className={styles.top}>
        <span className={styles.badge}>
          {t('tutorial.step', { current: index, total })}
        </span>
        <button className={styles.skip} onClick={onSkip}>
          {t('tutorial.skip')}
        </button>
      </div>
      <p className={styles.text}>{t(step.textKey)}</p>
      <div className={styles.dots} aria-hidden="true">
        {TUTORIAL_STEPS.map((definition, dotIndex) => (
          <span
            key={definition.id}
            className={`${styles.dot} ${dotIndex < profile.tutorialStep ? styles.done : ''} ${
              dotIndex === profile.tutorialStep ? styles.current : ''
            }`}
          />
        ))}
      </div>
      {step.targetItemId && onFocusObject ? (
        <Button
          variant="primary"
          size="md"
          fullWidth
          icon={<Icon name="sparkle" size={18} />}
          onClick={() => onFocusObject(step.targetItemId as string)}
        >
          {t('tutorial.showMe')}
        </Button>
      ) : null}
    </div>
  );
}
