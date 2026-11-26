import { useTranslation } from 'react-i18next';
import { itemById, type ActiveAction } from '@vida/shared';
import { Button } from '@/ui/components/Button';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  action: ActiveAction;
  progress: number;
  onCancel: () => void;
  onSkip: () => void;
}

/**
 * Floating pill shown while the character is busy ("Dormindo…", "Comendo…").
 * It shows a real progress bar (aria-progressbar) and two controls: skip
 * (fast-forward the rest) and cancel. Big targets, one thumb reach.
 */
export function ActionBar({ action, progress, onCancel, onSkip }: ActionBarProps) {
  const { t } = useTranslation();
  const item = itemById(action.itemId);
  const label = t(`interactions.${action.interactionId}`);
  const itemLabel = item ? t(`items.${item.sprite}`) : action.itemId;
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div className={styles.bar} role="group" aria-label={`${label} · ${itemLabel}`}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.item}>{itemLabel}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="md" onClick={onCancel} className={styles.small}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="md" onClick={onSkip} className={styles.small}>
          {t('play.skip')}
        </Button>
      </div>
    </div>
  );
}
