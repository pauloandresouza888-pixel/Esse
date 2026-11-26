import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { SplashScreen } from '@/ui/brand/SplashScreen';
import { Toaster } from '@/ui/components/Toaster';
import { OfflinePill } from '@/ui/components/OfflinePill';
import { applySettingsToDocument, useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { initInstallPrompt } from '@/platform/install';
import { initServiceWorker, subscribeUpdateAvailability } from '@/platform/update';
import { applyOrientation } from '@/platform/orientation';
import { useLanguageSync } from '@/i18n/useLanguageSync';
import { AppRoutes, preloadGameChunk } from './router';
import styles from './App.module.css';

/**
 * Root component.
 *
 * Boot sequence:
 *  1. load the save from localStorage (instant);
 *  2. show the splash for a minimum time;
 *  3. mount the router and start preloading the Phaser chunk in the background.
 */
export function App() {
  const { t } = useTranslation();
  const [splashDone, setSplashDone] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const load = useGameStore((state) => state.load);
  const flushSave = useGameStore((state) => state.flushSave);
  const settings = useGameStore((state) => state.save?.settings);
  const setOffline = useUiStore((state) => state.setOffline);
  const pushToast = useUiStore((state) => state.pushToast);

  useLanguageSync();

  useEffect(() => {
    try {
      load();
    } catch (error) {
      // A corrupted localStorage should never trap the player on a blank screen.
      console.error('[boot] failed to load save', error);
      setBootError(error instanceof Error ? error.message : String(error));
    }
  }, [load]);

  // The save remembers the player's language and accessibility flags; apply
  // them at boot so a returning player never sees a flash of the wrong UI.
  useEffect(() => {
    if (!settings) return;
    const language = settings.language ?? 'pt-BR';
    applySettingsToDocument(settings, language);
    if (i18n.resolvedLanguage !== language) void i18n.changeLanguage(language);
  }, [settings]);

  useEffect(() => {
    initInstallPrompt();
    initServiceWorker();

    const unsubscribeUpdate = subscribeUpdateAvailability((available) => {
      if (!available) return;
      pushToast({
        message: t('update.body'),
        tone: 'info',
        actionLabel: t('update.action'),
        durationMs: 12000,
        onAction: () => {
          void import('@/platform/update').then(({ applyServiceWorkerUpdate }) =>
            applyServiceWorkerUpdate(),
          );
        },
      });
    });

    const onOnline = () => {
      setOffline(false);
      pushToast({ message: t('offline.back'), tone: 'success', durationMs: 2600 });
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') useGameStore.getState().flushSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);

    return () => {
      unsubscribeUpdate();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, [pushToast, setOffline, t]);

  // Keep the last loaded save safe when the tab is closed.
  useEffect(() => () => flushSave(), [flushSave]);

  useEffect(() => {
    if (settings) void applyOrientation(settings.orientation);
  }, [settings]);

  useEffect(() => {
    if (!splashDone) return;
    preloadGameChunk();
  }, [splashDone]);

  // The static splash from index.html is hidden as soon as React paints.
  useEffect(() => {
    const bootSplash = document.getElementById('boot-splash');
    if (bootSplash) {
      bootSplash.classList.add('boot-hidden');
      const timer = setTimeout(() => bootSplash.remove(), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  if (!splashDone) {
    return <SplashScreen onFinished={() => setSplashDone(true)} />;
  }

  if (bootError) {
    return (
      <div className={styles.error} role="alert">
        <h1>{t('errors.boot')}</h1>
        <p>{bootError}</p>
        <button className={styles.retry} onClick={() => window.location.reload()}>
          {t('errors.retry')}
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <div className="app-frame">
        <AppRoutes />
        <OfflinePill />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
