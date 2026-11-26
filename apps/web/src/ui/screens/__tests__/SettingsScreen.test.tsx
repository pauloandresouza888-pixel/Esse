import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { defaultSettings, renderWithProviders, seedSave } from '@/test/render';
import { SettingsScreen } from '../SettingsScreen';
import { useGameStore } from '@/stores/gameStore';
import i18n from '@/i18n';

// Without `globals: true`, Testing Library cannot auto-clean between tests.
afterEach(() => cleanup());

describe('SettingsScreen', () => {
  it('renders every section and changes visibility settings', async () => {
    seedSave({ settings: defaultSettings });
    renderWithProviders(<SettingsScreen />, { route: '/ajustes' });

    expect(screen.getByRole('heading', { name: i18n.t('settings.title') })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('settings.sections.accessibility'))).toBeInTheDocument();

    const largeText = screen.getByRole('switch', { name: i18n.t('settings.largeText') });
    expect(largeText).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(largeText);
    expect(largeText).toHaveAttribute('aria-checked', 'true');
    await Promise.resolve();
    expect(document.documentElement.dataset.largeText).toBe('true');
  });

  it('switches language and translates the interface immediately', async () => {
    seedSave({ settings: defaultSettings });
    renderWithProviders(<SettingsScreen />, { route: '/ajustes' });

    fireEvent.click(screen.getByRole('radio', { name: i18n.t('settings.languages.en') }));
    await waitFor(() => expect(i18n.language).toBe('en'));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(useGameStore.getState().save?.settings.language).toBe('en');
    // restore the language for the other tests
    await i18n.changeLanguage('pt-BR');
  });

  it('applies the graphics quality choice', () => {
    seedSave({ settings: defaultSettings });
    renderWithProviders(<SettingsScreen />, { route: '/ajustes' });
    const qualityGroup = screen.getByRole('radiogroup', { name: i18n.t('settings.quality') });
    const low = within(qualityGroup).getByRole('radio', { name: i18n.t('settings.qualities.low') });
    fireEvent.click(low);
    expect(low).toHaveAttribute('aria-checked', 'true');
    expect(useGameStore.getState().save?.settings.quality).toBe('low');
  });
});
