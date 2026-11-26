import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, seedSave } from '@/test/render';
import { MenuScreen } from '../MenuScreen';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import i18n from '@/i18n';

afterEach(() => {
  cleanup();
  useUiStore.setState({ toasts: [] });
});

describe('MenuScreen', () => {
  it('shows the continue card with the house, clock and last session', () => {
    renderWithProviders(<MenuScreen />, { seed: { displayName: 'Marina' } });

    expect(screen.getByText(i18n.t('menu.guestWelcome', { name: 'Marina' }))).toBeInTheDocument();
    expect(screen.getByTestId('continue-card')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('cards.houseSubtitle'))).toBeInTheDocument();
    // The clock pill shows a HH:MM label.
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('creates a guest profile automatically on the first visit', () => {
    useGameStore.setState({ bootStatus: 'ready', save: null, storageWarning: null });
    renderWithProviders(<MenuScreen />, { seed: null });
    expect(useGameStore.getState().save).not.toBeNull();
    expect(useGameStore.getState().save?.profile.isGuest).toBe(true);
  });

  it('offers the four main actions and sends new games to the creator', () => {
    seedSave();
    renderWithProviders(<MenuScreen />);

    expect(screen.getByRole('button', { name: new RegExp(i18n.t('menu.newGame')) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(i18n.t('menu.friends')) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(i18n.t('menu.settings')) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(i18n.t('menu.about')) })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('menu.newGame')) }));
    // Phase 1: "new game" opens the character creator instead of a stub toast.
    expect(screen.getByTestId('location')).toHaveTextContent('/criar');
  });

  it('opens the about sheet and can reset the save after confirmation', () => {
    const seeded = seedSave();
    renderWithProviders(<MenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('menu.about')) }));
    const dialog = screen.getByRole('dialog', { name: i18n.t('menu.about') });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('menu.resetSave') }));
    const confirmDialog = screen.getByRole('dialog', { name: i18n.t('menu.resetSave') });
    const confirmButton = confirmDialog.querySelector('footer button:last-child') as HTMLButtonElement;
    fireEvent.click(confirmButton);

    const newSave = useGameStore.getState().save;
    expect(newSave?.profile.id).not.toBe(seeded.profile.id);
    expect(newSave?.profile.tutorialDone).toBe(false);
  });
});
