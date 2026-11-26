import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_BRAND, type LanguageCode } from '@vida/shared';
import { TopBar } from '@/ui/components/TopBar';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { Slider } from '@/ui/components/Slider';
import { Toggle } from '@/ui/components/Toggle';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SettingsRow } from '@/ui/components/SettingsRow';
import { applySettingsToDocument, useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { setLanguage } from '@/i18n';
import { storage } from '@/platform/storage';
import { canPromptInstall, promptInstall } from '@/platform/install';
import { readDeviceInfo } from '@/platform/device';
import { sound } from '@/platform/audio';
import { routes } from '@/app/router';
import styles from './SettingsScreen.module.css';
import { publicUrl } from '@/platform/publicUrl';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const settings = useGameStore((state) => state.save?.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const save = useGameStore((state) => state.save);
  const pushToast = useUiStore((state) => state.pushToast);
  const device = useState(readDeviceInfo)[0];
  const [installed, setInstalled] = useState(device.isStandalone);
  const [storageKb, setStorageKb] = useState(0);

  useEffect(() => {
    setStorageKb(Math.round((storage.usedBytes() / 1024) * 10) / 10);
  }, [save]);

  if (!settings) return null;

  const changeLanguage = (language: LanguageCode) => {
    updateSettings({ language });
    void setLanguage(language);
    applySettingsToDocument({ ...settings, language }, language);
  };

  const setAutonomous = useGameStore((state) => state.setAutonomous);
  const autonomous = useGameStore((state) => state.save?.world.autonomous ?? true);

  const change = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    applySettingsToDocument(
      { ...settings, ...patch },
      i18n.resolvedLanguage === 'en' ? 'en' : 'pt-BR',
    );
    // Audio sliders and toggles must be audible immediately, not next reload.
    sound.applySettings();
  };

  const changeDayLength = (seconds: number) => {
    change({ dayLengthSeconds: seconds });
    // The clock stores its own length; apply it to the running save too.
    const current = useGameStore.getState().save;
    if (current) {
      useGameStore.setState({
        save: {
          ...current,
          world: { ...current.world, clock: { ...current.world.clock, dayLengthMs: seconds * 1000 } },
        },
      });
      useGameStore.getState().flushSave();
    }
  };

  return (
    <main className="screen">
      <TopBar title={t('settings.title')} backTo={routes.menu} />
      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="settings-display">
          <h2 id="settings-display" className={styles.sectionTitle}>
            {t('settings.sections.display')}
          </h2>
          <Card>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('settings.quality')}</span>
              <SegmentedControl
                label={t('settings.quality')}
                value={settings.quality}
                onChange={(quality) => change({ quality })}
                options={[
                  { value: 'low', label: t('settings.qualities.low') },
                  { value: 'medium', label: t('settings.qualities.medium') },
                  { value: 'high', label: t('settings.qualities.high') },
                ]}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('settings.orientation')}</span>
              <SegmentedControl
                label={t('settings.orientation')}
                value={settings.orientation}
                onChange={(orientation) => change({ orientation })}
                options={[
                  { value: 'portrait', label: t('settings.orientations.portrait') },
                  { value: 'landscape', label: t('settings.orientations.landscape') },
                  { value: 'auto', label: t('settings.orientations.auto') },
                ]}
              />
              <p className={styles.fieldHint}>{t('settings.applyOrientationHint')}</p>
            </div>
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-audio">
          <h2 id="settings-audio" className={styles.sectionTitle}>
            {t('settings.sections.audio')}
          </h2>
          <Card>
            <Slider
              label={t('settings.music')}
              value={settings.musicVolume}
              onChange={(musicVolume) => change({ musicVolume })}
              icon={<Icon name="music" size={17} />}
            />
            <Slider
              label={t('settings.sfx')}
              value={settings.sfxVolume}
              onChange={(sfxVolume) => change({ sfxVolume })}
              icon={<Icon name={settings.sfxVolume > 0 ? 'volume' : 'volume-off'} size={17} />}
            />
            <Toggle
              label={t('settings.haptics')}
              hint={t('settings.hapticsHint')}
              checked={settings.haptics}
              disabled={!device.supportsVibrate}
              onChange={(haptics) => change({ haptics })}
            />
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('settings.dayLength')}</span>
              <SegmentedControl
                label={t('settings.dayLength')}
                value={String(settings.dayLengthSeconds)}
                onChange={(value) => changeDayLength(Number(value))}
                options={[
                  { value: '720', label: t('settings.dayLengths.short') },
                  { value: '1440', label: t('settings.dayLengths.normal') },
                  { value: '2880', label: t('settings.dayLengths.long') },
                ]}
              />
              <p className={styles.fieldHint}>{t('settings.dayLengthHint')}</p>
            </div>
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-a11y">
          <h2 id="settings-a11y" className={styles.sectionTitle}>
            {t('settings.sections.accessibility')}
          </h2>
          <Card>
            <Toggle
              label={t('settings.largeText')}
              hint={t('settings.largeTextHint')}
              checked={settings.largeText}
              onChange={(largeText) => change({ largeText })}
            />
            <Toggle
              label={t('settings.colorBlind')}
              hint={t('settings.colorBlindHint')}
              checked={settings.colorBlindMode}
              onChange={(colorBlindMode) => change({ colorBlindMode })}
            />
            <Toggle
              label={t('settings.reducedMotion')}
              hint={t('settings.reducedMotionHint')}
              checked={settings.reducedMotion}
              onChange={(reducedMotion) => change({ reducedMotion })}
            />
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-gameplay">
          <h2 id="settings-gameplay" className={styles.sectionTitle}>
            {t('settings.sections.gameplay')}
          </h2>
          <Card>
            <Toggle
              label={t('settings.autonomous')}
              hint={t('settings.autonomousHint')}
              checked={autonomous}
              onChange={(value) => setAutonomous(value)}
            />
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-language">
          <h2 id="settings-language" className={styles.sectionTitle}>
            {t('settings.sections.language')}
          </h2>
          <Card>
            <SegmentedControl
              label={t('settings.language')}
              value={settings.language}
              onChange={(language) => changeLanguage(language)}
              options={[
                { value: 'pt-BR', label: t('settings.languages.pt-BR') },
                { value: 'en', label: t('settings.languages.en') },
              ]}
            />
            <p className={styles.fieldHint}>{t('settings.languageHint')}</p>
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-data">
          <h2 id="settings-data" className={styles.sectionTitle}>
            {t('settings.sections.data')}
          </h2>
          <Card>
            <SettingsRow
              icon="download"
              title={t('settings.install')}
              hint={installed ? t('settings.installed') : t('settings.installHint')}
              action={
                installed ? (
                  <Icon name="check" size={20} />
                ) : (
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={async () => {
                      if (!canPromptInstall()) {
                        pushToast({ message: t('settings.installUnsupported'), tone: 'info' });
                        return;
                      }
                      const outcome = await promptInstall();
                      if (outcome === 'accepted') setInstalled(true);
                    }}
                  >
                    {t('install.action')}
                  </Button>
                )
              }
            />
            <SettingsRow
              icon="lock"
              title={t('settings.storage')}
              hint={t('settings.storageHint')}
              action={<span>{t('settings.storageUsed', { kb: storageKb })}</span>}
            />
            <SettingsRow
              icon="shield"
              title={t('settings.privacy')}
              hint={t('settings.privacyHint')}
            />
          </Card>
        </section>

        <section className={styles.section} aria-labelledby="settings-about">
          <h2 id="settings-about" className={styles.sectionTitle}>
            {t('settings.sections.about')}
          </h2>
          <Card tone="warm">
            <div className={styles.about}>
              <img src={publicUrl('brand/logo-mark.svg')} alt="" width={56} height={56} />
              <div>
                <p className={styles.aboutName}>
                  {GAME_BRAND.name} · {t('common.version', { version: GAME_BRAND.version })}
                </p>
                <p className={styles.aboutText}>{t('settings.aboutText')}</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
