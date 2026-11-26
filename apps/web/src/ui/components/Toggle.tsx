import { vibrate } from '@/platform/device';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  /** Adds an "on/off" text next to the switch for color-blind friendliness. */
  showState?: boolean;
  disabled?: boolean;
}

/** Accessible switch row used across Settings. Tap target is the whole row. */
export function Toggle({ checked, onChange, label, hint, showState = true, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      className={styles.row}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        vibrate(8);
        onChange(!checked);
      }}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      <span className={`${styles.track} ${checked ? styles.trackOn : ''}`} aria-hidden="true">
        <span className={styles.thumb}>
          {showState ? <span className={styles.stateMark}>{checked ? '✓' : ''}</span> : null}
        </span>
      </span>
    </button>
  );
}
