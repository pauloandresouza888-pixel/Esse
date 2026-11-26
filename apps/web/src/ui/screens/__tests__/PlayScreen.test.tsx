import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, seedSave } from '@/test/render';
import { PlayScreen } from '../PlayScreen';
import { useGameStore } from '@/stores/gameStore';
import i18n from '@/i18n';

afterEach(() => cleanup());

/**
 * The Play screen mounts the Phaser wrapper, which is a no-op in test mode
 * (jsdom has no WebGL). Everything else — HUD, portrait, sheets, navigation —
 * is React and must work without the engine.
 */
describe('PlayScreen', () => {
  it('renders the HUD over the game with the saved character and money', async () => {
    renderWithProviders(<PlayScreen />, { route: '/jogar', seed: { money: 777 } });

    await waitFor(() => expect(screen.getByTestId('game-canvas')).toBeInTheDocument());
    expect(screen.getByTestId('character-portrait')).toBeInTheDocument();
    expect(screen.getByText('777')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('cards.day', { day: 1 }))).toBeInTheDocument();
    expect(screen.getAllByRole('meter')).toHaveLength(7);
  });

  it('shows the tip banner when entering the room', async () => {
    renderWithProviders(<PlayScreen />, { route: '/jogar' });
    // The tip appears both as the top banner and as the footer hint.
    await waitFor(() =>
      expect(screen.getAllByText(i18n.t('play.tapHint')).length).toBeGreaterThanOrEqual(2),
    );
  });

  it('asks the player to start a game when there is no save', () => {
    useGameStore.setState({ bootStatus: 'ready', save: null, storageWarning: null });
    renderWithProviders(<PlayScreen />, { route: '/jogar', seed: null });
    expect(screen.getByText(i18n.t('menu.noSave'))).toBeInTheDocument();
  });

  it('pauses the game from the HUD', async () => {
    renderWithProviders(<PlayScreen />, { route: '/jogar' });
    const pause = await screen.findByRole('button', { name: i18n.t('common.pause') });
    fireEvent.click(pause);
    expect(await screen.findByRole('button', { name: i18n.t('common.play') })).toBeInTheDocument();
  });
});

/**
 * Interaction path without the engine: the HUD shortcut opens the object sheet,
 * starting an action shows the progress bar and "skip" applies it instantly.
 * The canvas is a stub in test mode, so these flows are pure React + store.
 */
describe('PlayScreen interactions', () => {
  it('opens the object sheet from a critical-need shortcut and runs the action', async () => {
    const seeded = seedSave();
    const hungry = { ...seeded.world.needs, hunger: 8 };
    useGameStore.setState({
      save: { ...seeded, world: { ...seeded.world, needs: hungry } },
    });

    renderWithProviders(<PlayScreen />, { route: '/jogar', seed: null });
    await waitFor(() => expect(screen.getByTestId('game-canvas')).toBeInTheDocument());

    // The critical-need chip appears and opens the fridge sheet.
    const shortcut = await screen.findByRole('button', {
      name: new RegExp(`${i18n.t('play.critical')}: ${i18n.t('needs.hunger')}`),
    });
    fireEvent.click(shortcut);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(i18n.t(`items.${'fridge'}`));

    // "Eat" starts the action; the bar with the skip button appears.
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(i18n.t('interactions.eat')) }));
    expect(useGameStore.getState().save?.world.action?.interactionId).toBe('eat');

    const skip = await screen.findByRole('button', { name: i18n.t('common.skip') });
    fireEvent.click(skip);

    expect(useGameStore.getState().save?.world.action).toBeNull();
    expect(useGameStore.getState().save?.world.needs.hunger).toBeGreaterThan(8);
  });

  it('sends a new game to the creator and a saved game to the room', async () => {
    useGameStore.setState({ bootStatus: 'ready', save: null, storageWarning: null });
    renderWithProviders(<PlayScreen />, { route: '/jogar', seed: null });
    expect(screen.getByText(i18n.t('menu.noSave'))).toBeInTheDocument();
  });
});
