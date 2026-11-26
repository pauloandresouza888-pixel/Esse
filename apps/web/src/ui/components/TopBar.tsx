import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  /** Where the back button goes. When omitted, no back button is shown. */
  backTo?: string;
  /** Optional trailing element (usually an icon button). */
  trailing?: React.ReactNode;
}

/** Consistent header for secondary screens (Settings, Friends). */
export function TopBar({ title, backTo, trailing }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className={styles.bar}>
      {backTo ? (
        <Link to={backTo} className={styles.back} aria-label={t('common.back')}>
          <Icon name="arrow-left" size={22} />
        </Link>
      ) : (
        <span className={styles.spacer} aria-hidden="true" />
      )}
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.trailing}>{trailing}</span>
    </header>
  );
}
