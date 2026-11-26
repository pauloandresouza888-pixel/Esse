import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/components/Button';
import styles from './NotFoundScreen.module.css';

export function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <main className={`screen ${styles.wrapper}`}>
      <img src="/brand/logo-mark.svg" alt="" width={120} height={120} className={styles.logo} />
      <h1 className={styles.title}>404</h1>
      <p className={styles.body}>{t('errors.generic')}</p>
      <Link to="/">
        <Button variant="primary">{t('common.back')}</Button>
      </Link>
    </main>
  );
}
