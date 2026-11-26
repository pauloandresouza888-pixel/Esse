import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import {
  createCharacterForTest,
  DEFAULT_SETTINGS,
  createNewSave,
  createNeeds,
  type SaveGame,
  type Settings,
} from '@vida/shared';
import { initI18n } from '@/i18n';
import { useGameStore } from '@/stores/gameStore';

/**
 * Test renderer with router + i18n + a seeded save.
 *
 * Tests run against the real translation files: a missing key is a real bug, so
 * it must fail a test instead of showing "common.foo" to a player.
 */
initI18n('pt-BR');

export const defaultSettings: Settings = { ...DEFAULT_SETTINGS };

export interface SeedOptions {
  displayName?: string;
  settings?: Partial<Settings>;
  money?: number;
  tutorialDone?: boolean;
}

/** Puts a valid save in the store without touching localStorage. */
export function seedSave(options: SeedOptions = {}): SaveGame {
  const save = createNewSave(
    {
      id: 'player-test',
      displayName: options.displayName ?? 'Teste',
      friendCode: 'ABCD2345',
      createdAt: new Date().toISOString(),
      isGuest: true,
      tutorialDone: options.tutorialDone ?? true,
      tutorialStep: 0,
    },
    createCharacterForTest(),
    createNeeds(),
  );
  const seeded: SaveGame = {
    ...save,
    settings: { ...save.settings, ...options.settings },
    world: { ...save.world, money: options.money ?? save.world.money },
  };
  useGameStore.setState({ bootStatus: 'ready', save: seeded, storageWarning: null });
  return seeded;
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  seed?: SeedOptions | null;
}

/** Hidden probe so tests can assert navigation without mocking the router. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location" hidden>{location.pathname}</output>;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = '/', seed = {}, ...rest } = options;
  if (seed) seedSave(seed);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      {children}
    </MemoryRouter>
  );
  return render(ui, { wrapper, ...rest });
}
