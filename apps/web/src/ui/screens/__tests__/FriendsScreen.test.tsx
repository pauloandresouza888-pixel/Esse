import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, seedSave } from '@/test/render';
import { FriendsScreen } from '../FriendsScreen';
import { useUiStore } from '@/stores/uiStore';
import i18n from '@/i18n';

afterEach(() => {
  cleanup();
  useUiStore.setState({ toasts: [] });
});

describe('FriendsScreen', () => {
  it('shows the player friend code and the invite action', () => {
    seedSave();
    renderWithProviders(<FriendsScreen />, { route: '/amigos' });
    expect(screen.getByTestId('friend-code')).toHaveTextContent('ABCD2345');
    expect(screen.getByRole('button', { name: new RegExp(i18n.t('friends.copy')) })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('friends.emptyTitle'))).toBeInTheDocument();
  });

  it('validates the friend code before doing anything', () => {
    seedSave();
    renderWithProviders(<FriendsScreen />, { route: '/amigos' });

    const input = screen.getByPlaceholderText(i18n.t('friends.addPlaceholder'));
    fireEvent.change(input, { target: { value: 'ABC' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('friends.addButton')) }));
    expect(useUiStore.getState().toasts.at(-1)?.message).toBe(i18n.t('friends.addInvalid'));

    fireEvent.change(input, { target: { value: 'abcd2345' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('friends.addButton')) }));
    expect(useUiStore.getState().toasts.at(-1)?.message).toBe(i18n.t('menu.toastFriendsSoon'));
  });

  it('copies the code to the clipboard when the API is available', async () => {
    seedSave();
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value: string) => writes.push(value) },
    });
    renderWithProviders(<FriendsScreen />, { route: '/amigos' });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('friends.copy')) }));
    await Promise.resolve();
    await Promise.resolve();
    expect(writes).toEqual(['ABCD2345']);
    expect(useUiStore.getState().toasts.at(-1)?.message).toBe(i18n.t('friends.copied'));
  });
});
