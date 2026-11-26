import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createNeeds } from '@vida/shared';
import { GameHud } from '../GameHud';
import { renderWithProviders } from '@/test/render';
import i18n from '@/i18n';

afterEach(() => cleanup());

const baseProps = {
  visible: true,
  clockLabel: '14:30',
  phase: 'afternoon',
  day: 2,
  money: 425,
  moodPercent: 74,
  portrait: <div data-testid="portrait" />,
  paused: false,
  onTogglePause: () => undefined,
  onBack: () => undefined,
  onHideHud: () => undefined,
};

describe('GameHud', () => {
  it('shows the clock, day, money, portrait and all seven needs', () => {
    renderWithProviders(<GameHud {...baseProps} needs={createNeeds({ hunger: 62 })} />);

    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('cards.day', { day: 2 }))).toBeInTheDocument();
    expect(screen.getByText('425')).toBeInTheDocument();
    expect(screen.getByTestId('portrait')).toBeInTheDocument();

    for (const need of ['hunger', 'energy', 'hygiene', 'bladder', 'fun', 'social', 'mood']) {
      expect(screen.getByRole('meter', { name: i18n.t(`needs.${need}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('meter', { name: i18n.t('needs.hunger') })).toHaveAttribute(
      'aria-valuenow',
      '62',
    );
  });

  it('marks critical needs so they can be styled without relying on color', () => {
    renderWithProviders(<GameHud {...baseProps} needs={createNeeds({ energy: 8 })} />);
    const energy = screen.getByRole('meter', { name: i18n.t('needs.energy') });
    expect(energy.className).toContain('critical');
    expect(energy).toHaveAttribute('aria-valuetext', `${i18n.t('needs.energy')}: 8`);
  });

  it('exposes pause, back and hide controls', () => {
    const onTogglePause = vi.fn();
    const onBack = vi.fn();
    renderWithProviders(
      <GameHud {...baseProps} needs={createNeeds()} onTogglePause={onTogglePause} onBack={onBack} />,
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.back') }));
    mustHaveBeenCalled(onBack);

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.pause') }));
    mustHaveBeenCalled(onTogglePause);
  });

  it('falls back to the Phase 1 notice when no needs are available', () => {
    renderWithProviders(<GameHud {...baseProps} />);
    expect(screen.getByText(i18n.t('cards.needsSoon'))).toBeInTheDocument();
  });
});

function mustHaveBeenCalled(fn: ReturnType<typeof vi.fn>) {
  expect(fn).toHaveBeenCalledTimes(1);
}
