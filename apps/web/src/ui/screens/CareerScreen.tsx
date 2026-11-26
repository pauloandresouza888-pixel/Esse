import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CAREERS,
  CAREER_DEFINITIONS,
  CAREER_SKILL,
  isShiftActive,
  MAX_CAREER_LEVEL,
  readClock,
  shiftSalary,
  SKILLS,
  type CareerId,
} from '@vida/shared';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { TopBar } from '@/ui/components/TopBar';
import { hapticTap, sound } from '@/platform/audio';
import { routes } from '@/app/router';
import styles from './CareerScreen.module.css';

const SKILL_EMOJI: Record<string, string> = {
  cooking: '🍳',
  writing: '✍️',
  paint: '🎨',
  programming: '💻',
  fitness: '🏃',
  logic: '🧩',
  charisma: '💬',
};

/**
 * Career and skills screen.
 *
 * One page, three blocks: current job (or the offer list), the seven skills with
 * their bars, and the rules in plain language. The work button only appears
 * inside the shift window — the character cannot "work" at 3 a.m. just because
 * the player tapped.
 */
export function CareerScreen() {
  const { t } = useTranslation();
  const save = useGameStore((state) => state.save);
  const startCareer = useGameStore((state) => state.startCareer);
  const workShift = useGameStore((state) => state.workShift);
  const pushToast = useUiStore((state) => state.pushToast);
  const [tab, setTab] = useState<'job' | 'offers'>('job');

  const clock = save ? readClock(save.world.clock) : null;
  const career = save?.world.career ?? null;
  const definition = career ? CAREER_DEFINITIONS[career.career] : null;
  const working = career && clock ? isShiftActive(career, clock.hour) : false;

  const skills = useMemo(() => {
    if (!save) return [];
    return SKILLS.map((skill) => ({
      id: skill,
      level: save.world.skills[skill] ?? 0,
      xp: save.world.skillXp?.[skill] ?? 0,
    }));
  }, [save]);

  if (!save || !clock) {
    return (
      <main className="screen">
        <TopBar title={t('career.title')} backTo={routes.menu} />
        <Card>
          <p>{t('menu.noSave')}</p>
          <Link to={routes.menu}>
            <Button variant="primary">{t('common.back')}</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const hire = (careerId: CareerId) => {
    if (startCareer(careerId)) {
      hapticTap();
      sound.play('tutorial');
      pushToast({ message: t('career.hired', { career: t(`careers.${careerId}`) }), tone: 'success' });
      setTab('job');
    }
  };

  const work = (missed = false) => {
    const result = workShift({ missed });
    if (result.salary > 0) {
      hapticTap(20);
      sound.play('complete');
      pushToast({ message: t('career.shiftPaid', { amount: result.salary }), tone: 'success' });
    }
    if (result.promoted) {
      sound.play('tutorial');
      pushToast({
        message: t('career.promoted', { level: result.level }),
        tone: 'success',
      });
    }
    if (missed) {
      sound.play('alert');
      pushToast({ message: t('career.missed'), tone: 'warning' });
    }
  };

  return (
    <main className={`screen ${styles.career}`}>
      <TopBar title={t('career.title')} backTo={routes.menu} />

      <div className={styles.tabs} role="tablist" aria-label={t('career.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'job'}
          className={`${styles.tab} ${tab === 'job' ? styles.tabActive : ''}`}
          onClick={() => setTab('job')}
        >
          {t('career.tabJob')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'offers'}
          className={`${styles.tab} ${tab === 'offers' ? styles.tabActive : ''}`}
          onClick={() => setTab('offers')}
        >
          {t('career.tabOffers')}
        </button>
      </div>

      {tab === 'job' ? (
        career && definition ? (
          <div className={styles.stack}>
            <Card>
              <div className={styles.jobHeader}>
                <div>
                  <p className={styles.eyebrow}>{t('career.currentJob')}</p>
                  <h2 className={styles.jobTitle}>{t(`careers.${career.career}`)}</h2>
                  <p className={styles.jobMeta}>
                    {t('career.level', { level: career.level, max: MAX_CAREER_LEVEL })} ·{' '}
                    {t('career.salary', { amount: shiftSalary(career) })}
                  </p>
                </div>
                <span className={styles.shiftBadge} data-active={working || undefined}>
                  {working ? t('career.onShift') : t('career.offShift')}
                </span>
              </div>

              <div className={styles.progressBlock}>
                <div className={styles.progressLabel}>
                  <span>{t('career.performance')}</span>
                  <strong>{Math.round(career.performance)}%</strong>
                </div>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(career.performance)}
                  aria-label={t('career.performance')}
                >
                  <span style={{ width: `${career.performance}%` }} />
                </div>
                <p className={styles.hint}>{t('career.performanceHint')}</p>
              </div>

              <p className={styles.hint}>
                {t('career.shiftWindow', {
                  start: String(definition.shift.startHour).padStart(2, '0'),
                  end: String((definition.shift.startHour + definition.shift.hours) % 24).padStart(2, '0'),
                })}
              </p>

              <div className={styles.actions}>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={!working}
                  onClick={() => work(false)}
                  icon={<Icon name="check" size={18} />}
                >
                  {working ? t('career.workNow') : t('career.waitShift')}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => work(true)}>
                  {t('career.skipShift')}
                </Button>
              </div>
              <p className={styles.hint}>{t('career.skipShiftHint')}</p>
            </Card>
          </div>
        ) : (
          <Card>
            <div className={styles.empty}>
              <span className={styles.emptyEmoji} aria-hidden="true">
                💼
              </span>
              <h2>{t('career.noJobTitle')}</h2>
              <p className={styles.hint}>{t('career.noJobHint')}</p>
              <Button variant="primary" onClick={() => setTab('offers')}>
                {t('career.seeOffers')}
              </Button>
            </div>
          </Card>
        )
      ) : null}

      {tab === 'offers' ? (
        <div className={styles.stack}>
          {CAREERS.map((careerId) => {
            const offer = CAREER_DEFINITIONS[careerId];
            const current = career?.career === careerId;
            return (
              <Card key={careerId}>
                <div className={styles.offer}>
                  <div>
                    <h3 className={styles.offerTitle}>{t(`careers.${careerId}`)}</h3>
                    <p className={styles.hint}>
                      {t('career.offerLine', {
                        amount: offer.salary[0] ?? 0,
                        hours: offer.shift.hours,
                        start: String(offer.shift.startHour).padStart(2, '0'),
                      })}
                    </p>
                    <p className={styles.skillLine}>
                      <span aria-hidden="true">{SKILL_EMOJI[offer.skill] ?? '⭐'}</span>
                      {t('career.trains', { skill: t(`skills.${CAREER_SKILL[careerId]}`) })}
                    </p>
                  </div>
                  <Button
                    variant={current ? 'ghost' : 'secondary'}
                    disabled={current}
                    onClick={() => hire(careerId)}
                  >
                    {current ? t('career.current') : t('career.apply')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card>
        <h2 className={styles.sectionTitle}>{t('career.skillsTitle')}</h2>
        <p className={styles.hint}>{t('career.skillsHint')}</p>
        <ul className={styles.skillList}>
          {skills.map((skill) => (
            <li key={skill.id} className={styles.skill}>
              <span className={styles.skillEmoji} aria-hidden="true">
                {SKILL_EMOJI[skill.id] ?? '⭐'}
              </span>
              <span className={styles.skillName}>{t(`skills.${skill.id}`)}</span>
              <span
                className={styles.skillBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={skill.level}
                aria-label={t(`skills.${skill.id}`)}
              >
                <span style={{ width: `${(skill.level / 10) * 100}%` }} />
              </span>
              <span className={styles.skillLevel}>
                {t('career.levelShort', { level: skill.level })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
