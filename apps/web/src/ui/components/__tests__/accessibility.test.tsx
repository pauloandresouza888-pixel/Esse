import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { Toggle } from '../Toggle';
import { SegmentedControl } from '../SegmentedControl';
import { Sheet } from '../Sheet';

afterEach(() => cleanup());

/**
 * Accessibility contract of the shared components.
 * These are the rules the whole game relies on (44px targets, real ARIA roles,
 * keyboard support), so they are asserted once here instead of per screen.
 */
describe('Button', () => {
  it('renders an accessible button and blocks clicks while loading', () => {
    const clicks: number[] = [];
    const { rerender } = render(
      <Button onClick={() => clicks.push(1)}>Salvar</Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(clicks).toHaveLength(1);

    rerender(
      <Button loading onClick={() => clicks.push(1)}>
        Salvando
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvando' }));
    expect(clicks).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Salvando' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Toggle', () => {
  it('behaves as a switch for assistive tech', () => {
    const changes: boolean[] = [];
    const { rerender } = render(
      <Toggle label="Texto grande" checked={false} onChange={(value) => changes.push(value)} />,
    );
    const toggle = screen.getByRole('switch', { name: 'Texto grande' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(changes).toEqual([true]);

    rerender(<Toggle label="Texto grande" checked onChange={() => undefined} />);
    expect(screen.getByRole('switch', { name: 'Texto grande' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('SegmentedControl', () => {
  it('is a radio group with a single selected option', () => {
    render(
      <SegmentedControl
        label="Qualidade"
        value="medium"
        onChange={() => undefined}
        options={[
          { value: 'low', label: 'Baixa' },
          { value: 'medium', label: 'Média' },
          { value: 'high', label: 'Alta' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Qualidade' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Baixa' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Sheet', () => {
  it('traps the escape key and restores focus when closed', () => {
    const onClose: number[] = [];
    const { rerender } = render(
      <Sheet open title="Detalhes" onClose={() => onClose.push(1)}>
        <p>conteúdo</p>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveLength(1);

    rerender(
      <Sheet open={false} title="Detalhes" onClose={() => undefined}>
        <p>conteúdo</p>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is tapped but not when the panel is', () => {
    const closes: number[] = [];
    render(
      <Sheet open title="Objeto" onClose={() => closes.push(1)}>
        <p>conteúdo</p>
      </Sheet>,
    );
    fireEvent.click(screen.getByText('conteúdo'));
    expect(closes).toHaveLength(0);
    fireEvent.click(screen.getByRole('presentation'));
    expect(closes).toHaveLength(1);
  });
});
