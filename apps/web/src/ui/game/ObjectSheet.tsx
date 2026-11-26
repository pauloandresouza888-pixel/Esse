import { useTranslation } from 'react-i18next';
import { itemById, type InteractionId, type Needs, type NeedKey } from '@vida/shared';
import { Sheet } from '@/ui/components/Sheet';
import { Button } from '@/ui/components/Button';
import { Icon } from '@/ui/components/Icon';
import styles from './ObjectSheet.module.css';

interface ObjectSheetProps {
  open: boolean;
  itemId: string | null;
  labelKey: string;
  needs: Needs | null;
  /** Interaction that the tutorial is asking for (highlighted). */
  suggestedInteraction?: InteractionId | null;
  /** True when the character cannot start a new action right now. */
  busy: boolean;
  onClose: () => void;
  onInteract: (interaction: InteractionId) => void;
}

const NEED_ICON: Record<NeedKey, string> = {
  hunger: '🍲',
  energy: '⚡',
  hygiene: '🫧',
  bladder: '🚻',
  fun: '🎈',
  social: '💬',
  mood: '😊',
};

/**
 * Bottom sheet with the actions of an object.
 *
 * Each action shows what it does to the needs (icons + numbers, not just color),
 * how long it takes in game minutes, and a "needs it" hint when the need is low.
 * This is the main gameplay screen of Phase 1, so it is designed to be read in
 * one glance: big buttons, one line of context, no nesting.
 */
export function ObjectSheet({
  open,
  itemId,
  labelKey,
  needs,
  suggestedInteraction,
  busy,
  onClose,
  onInteract,
}: ObjectSheetProps) {
  const { t } = useTranslation();
  const item = itemId ? itemById(itemId) : undefined;
  if (!item) {
    return (
      <Sheet open={open} title={t(labelKey)} onClose={onClose}>
        <p className={styles.empty}>{t('play.noActions')}</p>
      </Sheet>
    );
  }

  const interactions = [...new Set([item.primaryAction, ...(item.actions ?? [])])];

  return (
    <Sheet open={open} title={t(labelKey)} onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.price}>
            <Icon name="coin" size={14} />
            {t('play.objectValue', { value: item.price })}
          </span>
          {item.skill ? (
            <span className={styles.skill}>
              {t('play.skillGain', { skill: t(`skills.${item.skill}`) })}
            </span>
          ) : null}
        </div>

        {busy ? <p className={styles.busy}>{t('play.finishFirst')}</p> : null}

        <div className={styles.actions}>
          {interactions.map((interaction) => {
            const duration = item.durations[interaction];
            const effects = item.effects[interaction] ?? [];
            const suggested = suggestedInteraction === interaction;
            return (
              <button
                key={interaction}
                type="button"
                className={`${styles.action} ${suggested ? styles.suggested : ''}`}
                onClick={() => onInteract(interaction)}
                data-interaction={interaction}
              >
                <span className={styles.actionTop}>
                  <span className={styles.actionName}>
                    {t(`interactions.${interaction}`)}
                    {suggested ? <span className={styles.hint}>{t('tutorial.suggested')}</span> : null}
                  </span>
                  {typeof duration === 'number' ? (
                    <span className={styles.duration}>
                      <Icon name="clock" size={13} />
                      {t('play.minutes', { count: duration })}
                    </span>
                  ) : null}
                </span>
                <span className={styles.effects}>
                  {effects.length === 0 ? (
                    <span className={styles.neutral}>{t('play.noEffect')}</span>
                  ) : (
                    effects.map((effect) => {
                      const good = effect.amount > 0;
                      const critical = needs ? needs[effect.need] < 30 : false;
                      return (
                        <span
                          key={`${effect.need}`}
                          className={`${styles.effect} ${good ? styles.good : styles.bad} ${
                            critical && good ? styles.needed : ''
                          }`}
                        >
                          <span aria-hidden="true">{NEED_ICON[effect.need]}</span>
                          <span aria-hidden="true">{good ? '+' : ''}{effect.amount}</span>
                          <span className="sr-only">
                            {t(`needs.${effect.need}`)} {good ? '+' : ''}
                            {effect.amount}
                          </span>
                        </span>
                      );
                    })
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p className={styles.note}>{t('play.objectNote')}</p>
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Sheet>
  );
}
