import { useTranslation } from 'react-i18next';
import { mostUrgentNeed } from '@vida/shared';
import { useGameStore } from '@/stores/gameStore';

/**
 * One-line, friendly summary of the character's state under the Continue card.
 * Kept as a hook so Phase 1 can replace it with real emotions without touching
 * the menu layout.
 */
export function useMoodLine(): string {
  const { t } = useTranslation();
  const needs = useGameStore((state) => state.save?.world.needs ?? null);
  if (!needs) return t('cards.needsSoon');
  const urgent = mostUrgentNeed(needs);
  if (urgent) return `${t(`needs.${urgent}`)} · ${Math.round(needs[urgent])}/100`;
  return t('cards.npcLine');
}
