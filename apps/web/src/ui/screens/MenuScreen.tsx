import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GAME_BRAND, readClock } from '@vida/shared';
import { Button } from '@/ui/components/Button';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Sheet } from '@/ui/components/Sheet';
import { HousePreview } from '@/ui/components/HousePreview';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { useMoodLine } from '@/ui/hooks/useMoodLine';
import { relativeTimeKey } from '@/platform/time';
import { routes } from '@/app/router';
import styles from './MenuScreen.module.css';

/**
 * Main menu.
 *
 * Layout: logo, "Continue" hero card (house preview + clock + character), then a
 * 2x2 grid of actions. Everything is reachable with one thumb on a 375px wide
 * phone; nothing needs a horizontal scroll.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const save = useGameStore((state) => state.save);
  const createProfile = useGameStore((state) => state.createProfile);
  const resetSave = useGameStore((state) => state.resetSave);
  const pushToast = useUiStore((state) => state.pushToast);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const moodLine = useMoodLine();

  // A first-time visitor gets a guest profile automatically (no login wall in
  // Phase 0; real accounts arrive in Phase 3).
  useEffect(() => {
    if (!save) createProfile({ displayName: 'Jogador', tutorialDone: false });
  }, [createProfile, save]);

  const clock = save ? readClock(save.world.clock) : null;
  const lastPlayed = save ? relativeTimeKey(save.savedAt) : { key: 'timeAgo.never' as const };
  const lastPlayedLabel = t(lastPlayed.key, (lastPlayed as { params?: Record<string, number> }).params ?? {});

  const actions: { key: string; icon: IconName; label: string; onClick: () => void; tone: string }[] = [
    {
      key: 'new',
      icon: 'sparkle',
      label: t('menu.newGame'),
      tone: 'sun',
      onClick: () => navigate(`${routes.creator}?novo=1`),
    },
    {
      key: 'friends',
      icon: 'heart',
      label: t('menu.friends'),
      tone: 'pink',
      onClick: () => navigate(routes.friends),
    },
    {
      key: 'settings',
      icon: 'settings',
      label: t('menu.settings'),
      tone: 'mint',
      onClick: () => navigate(routes.settings),
    },
    {
      key: 'about',
      icon: 'info',
      label: t('menu.about'),
      tone: 'lilac',
      onClick: () => setAboutOpen(true),
    },
  ];

  return (
    <main className={`screen ${styles.menu}`}>
      <header className={styles.header}>
        <img
          className={styles.logo}
          src="/brand/logo-full.svg"
          alt={t('a11y.logo')}
          width={420}
          height={300}
        />
        <p className={styles.greeting}>
          {t('menu.guestWelcome', { name: save?.profile.displayName ?? 'Jogador' })}
        </p>
      </header>

      <section className={styles.heroWrap} aria-label={t('cards.houseTitle')}>
        <button
          type="button"
          className={styles.hero}
          onClick={() => navigate(routes.play)}
          data-testid="continue-card"
        >
          <HousePreview
            grid={save?.world.house.house.grid}
            items={save?.world.house.house.items}
            className={styles.preview}
          />
          <div className={styles.heroInfo}>
            <div className={styles.heroTop}>
              <div>
                <p className={styles.heroEyebrow}>{t('menu.continue')}</p>
                <h2 className={styles.heroTitle}>{t('cards.houseSubtitle')}</h2>
              </div>
              {clock ? (
                <span className={styles.clockPill}>
                  <Icon name={clock.phase === 'night' || clock.phase === 'evening' ? 'moon' : 'sun'} size={15} />
                  {clock.label}
                </span>
              ) : null}
            </div>
            <p className={styles.heroMood}>{moodLine}</p>
            {save && !save.profile.tutorialDone ? (
              <p className={styles.tutorialPill}>
                <Icon name="info" size={14} />
                {t('menu.tutorialResume')}
              </p>
            ) : null}
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>
                <Icon name="clock" size={14} />
                {t('menu.lastPlayed', { date: lastPlayedLabel })}
              </span>
              <span className={styles.playBadge}>
                <Icon name="play" size={13} />
                {t('menu.play')}
              </span>
            </div>
          </div>
        </button>
      </section>

      <section className={styles.grid} aria-label={t('menu.play')}>
        {actions.map((action) => (
          <button key={action.key} type="button" className={styles.tile} onClick={action.onClick}>
            <span className={`${styles.tileIcon} ${styles[action.tone]}`} aria-hidden="true">
              <Icon name={action.icon} size={24} />
            </span>
            <span className={styles.tileLabel}>{action.label}</span>
          </button>
        ))}
      </section>

      <footer className={styles.footer}>
        <button className={styles.footerLink} onClick={() => setAboutOpen(true)}>
          {t('common.version', { version: GAME_BRAND.version })} · {t('common.beta')}
        </button>
      </footer>

      <Sheet open={aboutOpen} title={t('menu.about')} onClose={() => setAboutOpen(false)}>
        <div className={styles.about}>
          <img src="/brand/logo-mark.svg" alt="" width={80} height={80} />
          <h3 className={styles.aboutTitle}>{GAME_BRAND.name}</h3>
          <p className={styles.aboutBody}>{t('settings.aboutText')}</p>
          <p className={styles.aboutMeta}>{t('settings.credits')}</p>
          <Button variant="ghost" onClick={() => setResetOpen(true)} icon={<Icon name="trash" size={18} />}>
            {t('menu.resetSave')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={resetOpen}
        title={t('menu.resetSave')}
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetSave();
                setResetOpen(false);
                setAboutOpen(false);
                pushToast({ message: t('menu.resetDone'), tone: 'success' });
              }}
            >
              {t('menu.resetSave')}
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>{t('menu.resetConfirm')}</p>
      </Sheet>
    </main>
  );
}
