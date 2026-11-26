import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { vibrate } from '@/platform/device';
import { useGameStore } from '@/stores/gameStore';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
  /** Shows a small spinner and disables interaction. */
  loading?: boolean;
}

/**
 * The only button component in the game.
 * Guarantees a 44x44 pt touch target, keyboard focus ring, haptic feedback and
 * a consistent pressed state — three accessibility rules in one place.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  className,
  children,
  onClick,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const hapticsEnabled = useGameStore((state) => state.save?.settings.haptics ?? true);

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (event) => {
    if (hapticsEnabled) vibrate(10);
    onClick?.(event);
  };

  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
