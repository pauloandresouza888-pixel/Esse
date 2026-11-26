import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/stores/uiStore';
import { Icon } from './Icon';
import styles from './OfflinePill.module.css';

/**
 * Slim status pill shown under the top bar when the device loses connection.
 * The game keeps running (solo mode is fully local in Phases 0–2), so the pill
 * informs instead of blocking.
 */
export function OfflinePill() {
  const isOffline = useUiStore((state) => state.isOffline);
  const { t } = useTranslation();
  if (!isOffline) return null;
  return (
    <div className={styles.pill} role="status">
      <Icon name="bolt" size={14} />
      <span>{t('offline.pill')}</span>
    </div>
  );
}
