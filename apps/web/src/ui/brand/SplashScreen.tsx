import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SplashScreen.module.css';

/**
 * Splash screen.
 *
 * It is shown while the save loads and while the Phaser chunk downloads, and
 * always for at least `MIN_VISIBLE_MS` so the animation does not flicker when
 * the app boots instantly on a fast device.
 */
interface SplashScreenProps {
  /** Called when the splash has finished its minimum display time. */
  onFinished: () => void;
}

const MIN_VISIBLE_MS = 1400;

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const start = performance.now();
    // The bar is decorative: it eases towards 92% and hands over to the screen.
    const interval = setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(0.6, (92 - current) * 0.08)));
    }, 90);
    const timeout = setTimeout(onFinished, MIN_VISIBLE_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      void start;
    };
  }, [onFinished]);

  return (
    <div className={styles.splash} data-testid="splash">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <img className={styles.logo} src="/brand/logo-full.svg" alt={t('a11y.logo')} width={420} height={300} />
        <p className={styles.tagline}>{t('brand.tagline')}</p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={t('splash.progress')}
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className={styles.bar} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.loading}>{t('boot.loading')}</p>
      </div>
      <p className={styles.badge}>{t('common.version', { version: '0.1.0' })}</p>
    </div>
  );
}
