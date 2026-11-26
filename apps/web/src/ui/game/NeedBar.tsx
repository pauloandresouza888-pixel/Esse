import { useTranslation } from 'react-i18next';
import type { NeedKey } from '@vida/shared';
import styles from './NeedBar.module.css';

/** Icon + color per need. Colors are supplemented by icons and labels so the
 *  HUD stays readable in color-blind mode (never color-only encoding). */
const NEED_META: Record<NeedKey, { icon: string; color: string; soft: string }> = {
  hunger: { icon: '🍲', color: '#F2994A', soft: '#FFE9D6' },
  energy: { icon: '⚡', color: '#8CBFE6', soft: '#E2F1FB' },
  hygiene: { icon: '🫧', color: '#7FC8A9', soft: '#DDF3E8' },
  bladder: { icon: '🚻', color: '#B79CE8', soft: '#EFE7FB' },
  fun: { icon: '🎈', color: '#F4A9BE', soft: '#FDE8EE' },
  social: { icon: '💬', color: '#F7C568', soft: '#FFF2D6' },
  mood: { icon: '😊', color: '#FF8A6A', soft: '#FFE4DA' },
};

interface NeedBarProps {
  need: NeedKey;
  value: number;
  /** When provided, a small "!" shortcut appears on critical values. */
  onShortcut?: () => void;
}

/**
 * Compact need meter: icon + label + a slim bar.
 * At small sizes the text label is hidden (only icons remain), while screen
 * readers still get the full "Fome: 62 de 100" sentence.
 */
export function NeedBar({ need, value, onShortcut }: NeedBarProps) {
  const { t } = useTranslation();
  const meta = NEED_META[need];
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const critical = clamped < 20;
  const label = t(`needs.${need}`);

  return (
    <div
      className={`${styles.row} ${critical ? styles.critical : ''}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${label}: ${clamped}`}
    >
      <span className={styles.icon} aria-hidden="true">
        {meta.icon}
      </span>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${clamped}%`, background: meta.color }}
        />
      </div>
      <span className={styles.value}>{clamped}</span>
      {critical && onShortcut ? (
        <button
          type="button"
          className={styles.fix}
          onClick={onShortcut}
          aria-label={`${label}: ${clamped}. ${'!'}`}
        >
          !
        </button>
      ) : null}
    </div>
  );
}
