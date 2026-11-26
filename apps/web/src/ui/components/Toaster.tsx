import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore, type Toast } from '@/stores/uiStore';
import { Icon } from './Icon';
import styles from './Toaster.module.css';

const TONE_ICON = {
  info: 'info',
  success: 'check',
  warning: 'bolt',
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((state) => state.dismissToast);
  const { t } = useTranslation();

  useEffect(() => {
    const timeout = setTimeout(() => dismiss(toast.id), toast.durationMs ?? 4200);
    return () => clearTimeout(timeout);
  }, [dismiss, toast.durationMs, toast.id]);

  return (
    <div className={`${styles.toast} ${styles[toast.tone]}`} role="status">
      <span className={styles.icon} aria-hidden="true">
        <Icon name={TONE_ICON[toast.tone]} size={18} />
      </span>
      <p className={styles.message}>{toast.message}</p>
      {toast.actionLabel && toast.onAction ? (
        <button
          className={styles.action}
          onClick={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
      <button className={styles.close} onClick={() => dismiss(toast.id)} aria-label={t('a11y.close')}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/** Renders the toast queue at the top of the app, below the safe area. */
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
