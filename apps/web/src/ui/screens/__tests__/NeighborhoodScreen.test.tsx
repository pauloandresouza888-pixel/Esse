import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, seedSave } from '@/test/render';
import { useGameStore } from '@/stores/gameStore';
import { NeighborhoodScreen } from '../NeighborhoodScreen';
import i18n from '@/i18n';

afterEach(cleanup);

describe('NeighborhoodScreen', () => {
  it('shows locals who are present and raises a relationship when chatting', () => {
    seedSave();
    renderWithProviders(<NeighborhoodScreen />, { route: '/bairro' });
    expect(screen.getByText(i18n.t('neighborhood.npcs.mia.name'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('neighborhood.talk') }));
    expect(useGameStore.getState().save?.world.relationships.mia).toMatchObject({ friendship: 8, interactions: 1 });
  });
});
