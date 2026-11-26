import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { CreatorScreen } from '../CreatorScreen';
import { useGameStore } from '@/stores/gameStore';
import { useCreatorStore } from '@/stores/creatorStore';
import i18n from '@/i18n';

afterEach(() => {
  cleanup();
  useCreatorStore.getState().reset();
  // The creator remembers the last draft (a real feature); tests start clean.
  window.localStorage.clear();
});

/**
 * Creator flow: five steps, live preview, validation and the final write into
 * the save. jsdom renders the SVG preview through a data URI, so the test also
 * guarantees the preview is never an empty <img>.
 */
describe('CreatorScreen', () => {
  it('shows the live preview and walks through all five steps', () => {
    renderWithProviders(<CreatorScreen />, { route: '/criar?novo=1' });

    expect(screen.getByRole('heading', { name: i18n.t('creator.title') })).toBeInTheDocument();
    const stage = screen.getByRole('img', { name: /prévia|preview/i });
    expect(stage.querySelector('img')?.getAttribute('src')).toContain('data:image/svg+xml');

    // Step 1: name.
    const nameInput = screen.getByLabelText(i18n.t('creator.name'));
    fireEvent.change(nameInput, { target: { value: 'Lia' } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') }));
    expect(useCreatorStore.getState().step).toBe(1);

    // Step 2: body. The preview must react to a skin change.
    fireEvent.click(screen.getByRole('radio', { name: i18n.t('colors.skin-7') }));
    expect(useCreatorStore.getState().appearance.skin).toBe('skin-7');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') }));

    // Step 3: hair & face tabs.
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('creator.tabs.face') }));
    // Face options are buttons labelled with the eye option name in the tile.
    fireEvent.click(screen.getByRole('button', { name: i18n.t('eyes.eyes-4') }));
    expect(useCreatorStore.getState().appearance.eyes).toBe('eyes-4');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') }));

    // Step 4: exactly five traits.
    const traitButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'false' && button.className.includes('trait'));
    expect(traitButtons.length).toBeGreaterThanOrEqual(6);
    for (const button of traitButtons.slice(0, 5)) fireEvent.click(button);
    expect(useCreatorStore.getState().traits).toHaveLength(5);
    // A sixth trait is refused (the limit is 5) — the button is disabled.
    expect(traitButtons[5]).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') }));

    // Step 5: aspiration + finish.
    expect(useCreatorStore.getState().step).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('aspirations.chef')) }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('creator.finish') }));

    const save = useGameStore.getState().save!;
    expect(save.world.character.name).toBe('Lia');
    expect(save.world.character.appearance.skin).toBe('skin-7');
    expect(save.world.character.appearance.eyes).toBe('eyes-4');
    expect(save.world.character.traits).toHaveLength(5);
    expect(save.world.character.aspiration).toBe('chef');
    expect(screen.getByTestId('location')).toHaveTextContent('/jogar');
  });

  it('blocks advancing without a name and explains why', () => {
    renderWithProviders(<CreatorScreen />, { route: '/criar?novo=1' });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.next') }));
    expect(useCreatorStore.getState().step).toBe(0);
    expect(useCreatorStore.getState().error).toBe('name');
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('creator.errors.name'));
  });
});
