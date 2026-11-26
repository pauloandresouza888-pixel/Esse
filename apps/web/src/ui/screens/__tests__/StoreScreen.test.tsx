import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, seedSave } from '@/test/render';
import { useGameStore } from '@/stores/gameStore';
import { StoreScreen } from '../StoreScreen';
import i18n from '@/i18n';

afterEach(cleanup);

describe('StoreScreen', () => {
  it('buys a catalog item, then places it from the inventory', () => {
    seedSave();
    const before = useGameStore.getState().save!.world.money;
    renderWithProviders(<StoreScreen />, { route: '/loja' });

    const mirrorName = screen.getByText(i18n.t('items.mirror'));
    const mirrorCard = mirrorName.closest('[class*=itemCard]') as HTMLElement;
    fireEvent.click(within(mirrorCard).getByRole('button', { name: i18n.t('store.buy') }));
    expect(useGameStore.getState().save?.world.money).toBe(before - 70);
    expect(useGameStore.getState().save?.world.house.inventory).toEqual(['mirror']);

    fireEvent.click(screen.getByRole('tab', { name: new RegExp(i18n.t('store.tabBuild')) }));
    const inventoryItem = screen.getByText(i18n.t('items.mirror')).closest('[class*=itemCard]') as HTMLElement;
    fireEvent.click(within(inventoryItem).getByRole('button', { name: i18n.t('store.place') }));
    expect(useGameStore.getState().save?.world.house.inventory).toEqual([]);
    expect(useGameStore.getState().save?.world.house.placed[0]).toMatchObject({ itemId: 'mirror' });
  });
});
