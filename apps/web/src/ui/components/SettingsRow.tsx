import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './SettingsRow.module.css';

interface SettingsRowProps {
  icon: IconName;
  title: string;
  hint?: string;
  /** Right side content: value text, a button or a Toggle. */
  action?: ReactNode;
  onClick?: () => void;
}

/** Row with leading icon used in Settings and About screens. */
export function SettingsRow({ icon, title, hint, action, onClick }: SettingsRowProps) {
  const content = (
    <>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      {action ? <span className={styles.action}>{action}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`${styles.row} ${styles.tappable}`} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={styles.row}>{content}</div>;
}
