import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NEED_KEYS, type NeedKey, type Needs } from '@vida/shared';
import { Icon } from '@/ui/components/Icon';
import { NeedBar } from './NeedBar';
import { useBannerStore } from '@/stores/notificationBanner';
import styles from './GameHud.module.css';

interface GameHudProps {
  visible: boolean;
  clockLabel: string;
  phase: string;
  day: number;
  money: number;
  moodPercent: number;
  /** Dominant emotion (emoji + label), shown next to the mood. */
  emotion?: { emoji: string; key: string; tone: 'positive' | 'neutral' | 'negative' } | null;
  needs?: Needs;
  /** Needs currently below the critical threshold, worst first. */
  urgentNeeds?: NeedKey[];
  /** Called when the player taps the "!" shortcut of a critical need. */
  onNeedShortcut?: (need: NeedKey) => void;
  portrait: React.ReactNode;
  paused: boolean;
  onTogglePause: () => void;
  onBack: () => void;
  onHideHud: () => void;
}

/** Renders nothing during SSR/test when i18n is not initialized. */
export function GameHud({
  visible,
  clockLabel,
  phase,
  day,
  money,
  moodPercent,
  emotion = null,
  needs,
  urgentNeeds = [],
  onNeedShortcut,
  portrait,
  paused,
  onTogglePause,
  onBack,
  onHideHud,
}: GameHudProps) {
  const { t } = useTranslation();
  const banner = useBannerStore((state) => state.message);
  const hide = useBannerStore((state) => state.hide);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(hide, 4200);
    return () => clearTimeout(timer);
  }, [banner, hide]);

  const phaseIcon = phase === 'night' || phase === 'evening' ? 'moon' : 'sun';

  return (
    <div className={styles.hud} data-visible={visible}>
      <header className={styles.top}>
        <button className={styles.circleButton} onClick={onBack} aria-label={t('common.back')}>
          <Icon name="arrow-left" size={20} />
        </button>

        <div className={styles.identity}>
          {portrait}
          <div className={styles.identityText}>
            <span className={styles.clock}>
              <Icon name={phaseIcon} size={15} />
              {clockLabel}
              <span className={styles.day}>{t('cards.day', { day })}</span>
            </span>
            <span className={styles.moodLabel}>
              {t('play.pedestal')} · {moodPercent}%
              {emotion ? (
                <span className={`${styles.emotion} ${styles[`emotion_${emotion.tone}`] ?? ''}`}>
                  <span aria-hidden="true">{emotion.emoji}</span>
                  <span>{t(emotion.key)}</span>
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className={styles.money} aria-label={t('models.money')}>
          <Icon name="coin" size={16} />
          <span>{money}</span>
        </div>
      </header>

      <div className={styles.needsCard}>
        {needs ? (
          NEED_KEYS.map((key) => (
            <NeedBar
              key={key}
              need={key}
              value={needs[key]}
              onShortcut={onNeedShortcut ? () => onNeedShortcut(key) : undefined}
            />
          ))
        ) : (
          <p className={styles.needsPlaceholder}>{t('cards.needsSoon')}</p>
        )}
      </div>

      {urgentNeeds.length > 0 && onNeedShortcut ? (
        <div className={styles.alerts}>
          {urgentNeeds.slice(0, 2).map((need) => (
            <button
              key={need}
              type="button"
              className={styles.alert}
              onClick={() => onNeedShortcut(need)}
              aria-label={`${t('play.critical')}: ${t(`needs.${need}`)}`}
            >
              <span aria-hidden="true">!</span>
              {t(`needs.${need}`)}
            </button>
          ))}
        </div>
      ) : null}

      {banner ? (
        <div className={styles.banner} role="status">
          <Icon name="info" size={16} />
          <span>{banner}</span>
        </div>
      ) : null}

      <footer className={styles.bottom}>
        <button
          className={styles.circleButton}
          onClick={onHideHud}
          aria-label={t(visible ? 'common.close' : 'common.next')}
        >
          <Icon name={visible ? 'close' : 'grid'} size={18} />
        </button>
        <div className={styles.hint}>{t('play.tapHint')}</div>
        <button
          className={`${styles.circleButton} ${paused ? styles.active : ''}`}
          onClick={onTogglePause}
          aria-label={paused ? t('common.play') : t('common.pause')}
        >
          <Icon name={paused ? 'play' : 'pause'} size={18} />
        </button>
      </footer>
    </div>
  );
}
