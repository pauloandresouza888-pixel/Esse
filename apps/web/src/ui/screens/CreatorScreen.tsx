import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ACCESSORY_OPTIONS,
  ASPIRATIONS,
  BODY_TYPES,
  BROW_OPTIONS,
  BUILD_STEPS,
  EYE_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  HEIGHT_STEPS,
  MOUTH_OPTIONS,
  NOSE_OPTIONS,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  TRAITS,
  validateCharacterDraft,
  type Appearance,
  type Gender,
} from '@vida/shared';
import { characterSvg, svgToDataUri } from '@/game/art/characterSvg';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import { TopBar } from '@/ui/components/TopBar';
import { useGameStore } from '@/stores/gameStore';
import { useCreatorStore, rememberDraft, TOTAL_CREATOR_STEPS } from '@/stores/creatorStore';
import { useUiStore } from '@/stores/uiStore';
import { routes } from '@/app/router';
import styles from './CreatorScreen.module.css';

/**
 * Character creation (Phase 1).
 *
 * Five steps on a single scrolling column: identity → body → hair & face →
 * style → personality. The preview is always pinned on top, so every choice is
 * visible immediately. All text comes from the i18n files; option *names* are
 * generated from ids, which keeps the translation files small.
 *
 * State lives in `useCreatorStore` so leaving the screen (or rotating the phone)
 * does not lose the draft; "finish" writes a real character into the save.
 */
export function CreatorScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const save = useGameStore((state) => state.save);
  const createCharacter = useGameStore((state) => state.createCharacter);
  const pushToast = useUiStore((state) => state.pushToast);

  const step = useCreatorStore((state) => state.step);
  const name = useCreatorStore((state) => state.name);
  const age = useCreatorStore((state) => state.age);
  const gender = useCreatorStore((state) => state.gender);
  const appearance = useCreatorStore((state) => state.appearance);
  const traits = useCreatorStore((state) => state.traits);
  const aspiration = useCreatorStore((state) => state.aspiration);
  const profileName = useCreatorStore((state) => state.profileName);
  const error = useCreatorStore((state) => state.error);
  const setAppearance = useCreatorStore((state) => state.setAppearance);
  const toggleTrait = useCreatorStore((state) => state.toggleTrait);
  const setAspiration = useCreatorStore((state) => state.setAspiration);
  const patch = useCreatorStore((state) => state.patch);
  const next = useCreatorStore((state) => state.next);
  const back = useCreatorStore((state) => state.back);
  const setStep = useCreatorStore((state) => state.setStep);
  const startDraft = useCreatorStore((state) => state.start);

  const [tab, setTab] = useState<'hair' | 'face' | 'style'>('hair');
  const isNewGame = params.get('novo') === '1' || !save?.profile.tutorialDone;

  useEffect(() => {
    startDraft({
      appearance: save?.world.character.appearance,
      name: isNewGame ? undefined : save?.world.character.name,
      profileName: save?.profile.displayName,
    });
    // Run once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portrait = useMemo(() => svgToDataUri(characterSvg(appearance, { mood: 'happy' })), [appearance]);
  const bust = useMemo(
    () => svgToDataUri(characterSvg(appearance, { mode: 'bust', mood: 'happy' })),
    [appearance],
  );

  const finish = () => {
    const result = validateCharacterDraft({ name, traits, aspiration });
    if (!result.ok) {
      pushToast({ message: t(`creator.errors.${result.error ?? 'name'}`), tone: 'warning' });
      // Jump back to the step that owns the invalid field.
      setStep(result.error === 'name' ? 0 : result.error === 'traits' ? 3 : 4);
      return;
    }
    rememberDraft({ appearance, name, profileName });
    createCharacter({
      name,
      age,
      gender,
      appearance,
      traits,
      aspiration,
      profileName,
    });
    pushToast({ message: t('creator.created', { name: name.trim() }), tone: 'success' });
    navigate(routes.play);
  };

  return (
    <main className={`screen ${styles.creator}`}>
      <TopBar title={t('creator.title')} backTo={routes.menu} />

      <div className={styles.previewWrap}>
        <div className={styles.stage} role="img" aria-label={t('creator.previewLabel', { name: name || '—' })}>
          <img className={styles.portrait} src={portrait} alt="" />
        </div>
        <div className={styles.previewMeta}>
          <img className={styles.bust} src={bust} alt="" />
          <div>
            <p className={styles.previewName}>{name.trim() || t('creator.unnamed')}</p>
            <p className={styles.previewSub}>
              {t(`genders.${gender}`)} · {t('creator.years', { count: age })}
              {aspiration ? ` · ${t(`aspirations.${aspiration}`)}` : ''}
            </p>
          </div>
        </div>
      </div>

      <nav className={styles.steps} aria-label={t('creator.stepsLabel')}>
        {Array.from({ length: TOTAL_CREATOR_STEPS }, (_, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.stepDot} ${index === step ? styles.stepActive : ''} ${
              index < step ? styles.stepDone : ''
            }`}
            onClick={() => setStep(index)}
            aria-current={index === step ? 'step' : undefined}
            aria-label={t(`creator.steps.${index}`)}
          >
            <span aria-hidden="true">{index + 1}</span>
          </button>
        ))}
      </nav>

      <section className={styles.panel} aria-live="polite">
        {step === 0 ? (
          <div className={styles.group}>
            <h2 className={styles.heading}>{t('creator.nameTitle')}</h2>
            <label className={styles.field}>
              <span>{t('creator.name')}</span>
              <input
                className={styles.input}
                value={name}
                maxLength={20}
                placeholder={t('creator.namePlaceholder')}
                onChange={(event) => patch({ name: event.target.value })}
                autoComplete="off"
              />
            </label>
            {error === 'name' ? (
              <p className={styles.error} role="alert">
                {t('creator.errors.name')}
              </p>
            ) : null}
            <label className={styles.field}>
              <span>{t('creator.profileName')}</span>
              <input
                className={styles.input}
                value={profileName}
                maxLength={24}
                onChange={(event) => patch({ profileName: event.target.value })}
              />
            </label>
            <div className={styles.optionRow} role="radiogroup" aria-label={t('creator.gender')}>
              {(['feminine', 'masculine', 'neutral'] as Gender[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={gender === option}
                  className={`${styles.chip} ${gender === option ? styles.chipActive : ''}`}
                  onClick={() => patch({ gender: option })}
                >
                  {t(`genders.${option}`)}
                </button>
              ))}
            </div>
            <label className={styles.field}>
              <span>
                {t('creator.age')} · {age}
              </span>
              <input
                type="range"
                min={16}
                max={80}
                step={1}
                value={age}
                className={styles.range}
                onChange={(event) => patch({ age: Number(event.target.value) })}
                aria-valuetext={t('creator.years', { count: age })}
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className={styles.group}>
            <h2 className={styles.heading}>{t('creator.bodyTitle')}</h2>
            <span className={styles.label}>{t('creator.skin')}</span>
            <Swatches
              label={t('creator.skin')}
              options={SKIN_TONES.map((tone) => ({ id: tone.id, color: tone.color }))}
              value={appearance.skin}
              onPick={(skin) => setAppearance({ skin })}
            />
            <span className={styles.label}>{t('creator.bodyType')}</span>
            <div className={styles.optionRow}>
              {BODY_TYPES.map((body) => (
                <button
                  key={body}
                  type="button"
                  className={`${styles.chip} ${appearance.body === body ? styles.chipActive : ''}`}
                  aria-pressed={appearance.body === body}
                  onClick={() => setAppearance({ body })}
                >
                  {t(`bodyTypes.${body}`)}
                </button>
              ))}
            </div>
            <StepSlider
              label={t('creator.height')}
              value={appearance.height}
              steps={HEIGHT_STEPS}
              onChange={(height) => setAppearance({ height })}
            />
            <StepSlider
              label={t('creator.build')}
              value={appearance.build}
              steps={BUILD_STEPS}
              onChange={(build) => setAppearance({ build })}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.group}>
            <h2 className={styles.heading}>{t('creator.styleTitle')}</h2>
            <div className={styles.tabs} role="tablist" aria-label={t('creator.styleTitle')}>
              {(['hair', 'face', 'style'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                  onClick={() => setTab(key)}
                >
                  {t(`creator.tabs.${key}`)}
                </button>
              ))}
            </div>

            {tab === 'hair' ? (
              <>
                <span className={styles.label}>{t('creator.hairStyle')}</span>
                <div className={styles.grid}>
                  {HAIR_STYLES.map((hairStyle) => (
                    <OptionTile
                      key={hairStyle}
                      label={t(`hairStyles.${hairStyle}`)}
                      preview={svgToDataUri(characterSvg({ ...appearance, hairStyle }, { mode: 'bust' }))}
                      active={appearance.hairStyle === hairStyle}
                      onClick={() => setAppearance({ hairStyle })}
                    />
                  ))}
                </div>
                <span className={styles.label}>{t('creator.hairColor')}</span>
                <Swatches
                  label={t('creator.hairColor')}
                  options={HAIR_COLORS.map((tone) => ({ id: tone.id, color: tone.color }))}
                  value={appearance.hair}
                  onPick={(hair) => setAppearance({ hair })}
                />
              </>
            ) : null}

            {tab === 'face' ? (
              <>
                <span className={styles.label}>{t('creator.eyes')}</span>
                <div className={styles.grid}>
                  {EYE_OPTIONS.map((eyes) => (
                    <OptionTile
                      key={eyes.id}
                      label={t(`eyes.${eyes.id}`)}
                      preview={svgToDataUri(characterSvg({ ...appearance, eyes: eyes.id }, { mode: 'bust' }))}
                      active={appearance.eyes === eyes.id}
                      onClick={() => setAppearance({ eyes: eyes.id })}
                    />
                  ))}
                </div>
                <ColorList
                  label={t('creator.brows')}
                  ids={[...BROW_OPTIONS]}
                  translate={(id) => t(`brows.${id}`)}
                  value={appearance.brows}
                  onPick={(brows) => setAppearance({ brows })}
                />
                <ColorList
                  label={t('creator.nose')}
                  ids={[...NOSE_OPTIONS]}
                  translate={(id) => t(`noses.${id}`)}
                  value={appearance.nose}
                  onPick={(nose) => setAppearance({ nose })}
                />
                <ColorList
                  label={t('creator.mouth')}
                  ids={[...MOUTH_OPTIONS]}
                  translate={(id) => t(`mouths.${id}`)}
                  value={appearance.mouth}
                  onPick={(mouth) => setAppearance({ mouth })}
                />
              </>
            ) : null}

            {tab === 'style' ? (
              <>
                <span className={styles.label}>{t('creator.outfit')}</span>
                <div className={styles.optionRow}>
                  {OUTFIT_STYLES.map((outfit) => (
                    <button
                      key={outfit}
                      type="button"
                      className={`${styles.chip} ${appearance.outfit === outfit ? styles.chipActive : ''}`}
                      aria-pressed={appearance.outfit === outfit}
                      onClick={() => setAppearance({ outfit })}
                    >
                      {t(`outfits.${outfit}`)}
                    </button>
                  ))}
                </div>
                <span className={styles.label}>{t('creator.outfitColor')}</span>
                <Swatches
                  label={t('creator.outfitColor')}
                  options={OUTFIT_COLORS.map((tone) => ({ id: tone.id, color: tone.color }))}
                  value={appearance.outfitColor}
                  onPick={(outfitColor) => setAppearance({ outfitColor })}
                />
                <span className={styles.label}>{t('creator.accessory')}</span>
                <div className={styles.optionRow}>
                  {ACCESSORY_OPTIONS.map((accessory) => (
                    <button
                      key={accessory}
                      type="button"
                      className={`${styles.chip} ${appearance.accessory === accessory ? styles.chipActive : ''}`}
                      aria-pressed={appearance.accessory === accessory}
                      onClick={() => setAppearance({ accessory })}
                    >
                      {t(`accessories.${accessory}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.group}>
            <h2 className={styles.heading}>{t('creator.traitsTitle')}</h2>
            <p className={styles.help}>{t('creator.traitsHelp', { count: 5, selected: traits.length })}</p>
            <div className={styles.traitGrid}>
              {TRAITS.map((trait) => {
                const selected = traits.includes(trait.id);
                const full = !selected && traits.length >= 5;
                return (
                  <button
                    key={trait.id}
                    type="button"
                    className={`${styles.trait} ${selected ? styles.traitActive : ''}`}
                    aria-pressed={selected}
                    disabled={full}
                    onClick={() => toggleTrait(trait.id)}
                  >
                    <span className={styles.traitEmoji} aria-hidden="true">
                      {trait.emoji}
                    </span>
                    <span>{t(`traits.${trait.id}`)}</span>
                    {selected ? <Icon name="check" size={15} /> : null}
                  </button>
                );
              })}
            </div>
            {error === 'traits' ? (
              <p className={styles.error} role="alert">
                {t('creator.errors.traits')}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className={styles.group}>
            <h2 className={styles.heading}>{t('creator.aspirationTitle')}</h2>
            <p className={styles.help}>{t('creator.aspirationHelp')}</p>
            <div className={styles.aspirations}>
              {ASPIRATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.aspiration} ${aspiration === option ? styles.aspirationActive : ''}`}
                  aria-pressed={aspiration === option}
                  onClick={() => setAspiration(option)}
                >
                  <span className={styles.aspirationTitle}>{t(`aspirations.${option}`)}</span>
                  <span className={styles.aspirationHint}>{t(`aspirationHints.${option}`)}</span>
                </button>
              ))}
            </div>
            {error === 'aspiration' ? (
              <p className={styles.error} role="alert">
                {t('creator.errors.aspiration')}
              </p>
            ) : null}
            <div className={styles.summary}>
              <h3>{t('creator.summary')}</h3>
              <p>
                {name.trim() || t('creator.unnamed')} · {t(`aspirations.${aspiration || ASPIRATIONS[0]}`)}
              </p>
              <p className={styles.summaryTraits}>
                {traits.map((trait) => t(`traits.${trait}`)).join(' · ') || t('creator.errors.traits')}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <footer className={styles.footer}>
        {step > 0 ? (
          <Button variant="secondary" onClick={back} icon={<Icon name="arrow-left" size={18} />}>
            {t('common.back')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate(routes.menu)}>
            {t('common.cancel')}
          </Button>
        )}
        {step < TOTAL_CREATOR_STEPS - 1 ? (
          <Button variant="primary" onClick={() => next()} icon={<Icon name="arrow-right" size={18} />}>
            {t('common.next')}
          </Button>
        ) : (
          <Button variant="primary" onClick={finish} icon={<Icon name="check" size={18} />}>
            {t('creator.finish')}
          </Button>
        )}
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SMALL CONTROLS                                */
/* -------------------------------------------------------------------------- */

function Swatches({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: string; color: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.swatches} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          aria-label={t(`colors.${option.id}`)}
          className={`${styles.swatch} ${value === option.id ? styles.swatchActive : ''}`}
          style={{ background: option.color }}
          onClick={() => onPick(option.id)}
        />
      ))}
    </div>
  );
}

function ColorList({
  label,
  ids,
  translate,
  value,
  onPick,
}: {
  label: string;
  ids: string[];
  translate: (id: string) => string;
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className={styles.groupTight} role="radiogroup" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <div className={styles.optionRow}>
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={translate(id)}
            title={translate(id)}
            className={`${styles.dot} ${value === id ? styles.dotActive : ''}`}
            onClick={() => onPick(id)}
          />
        ))}
      </div>
    </div>
  );
}

function StepSlider({
  label,
  value,
  steps,
  onChange,
}: {
  label: string;
  value: number;
  steps: readonly number[];
  onChange: (value: number) => void;
}) {
  const index = Math.max(0, steps.findIndex((step) => Math.abs(step - value) < 0.002));
  return (
    <label className={styles.field}>
      <span>
        {label} · {index + 1}/{steps.length}
      </span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={index}
        className={styles.range}
        onChange={(event) => onChange(steps[Number(event.target.value)] ?? 1)}
        aria-valuetext={`${index + 1}/${steps.length}`}
      />
    </label>
  );
}

function OptionTile({
  label,
  preview,
  active,
  onClick,
}: {
  label: string;
  preview: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.tile} ${active ? styles.tileActive : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <img src={preview} alt="" />
      <span>{label}</span>
    </button>
  );
}

export type { Appearance };
