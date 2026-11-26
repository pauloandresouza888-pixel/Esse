import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HouseItemPlacement } from '@vida/shared';
import { HOUSE_GRID, itemById } from '@vida/shared';

/**
 * Tiny SVG floor plan used on the Continue card and (later) on the map.
 *
 * Rendering a real miniature of the player's house makes the menu feel like the
 * game rather than a list of buttons. Because it is plain SVG it scales to any
 * card size and costs almost nothing on mobile.
 */
interface HousePreviewProps {
  grid?: readonly string[];
  items?: readonly HouseItemPlacement[];
  className?: string;
}

const ROOM_COLORS: Record<string, string> = {
  bed: '#F7C568',
  fridge: '#9CCFEF',
  shower: '#A8D9F0',
  toilet: '#A8D9F0',
  sofa: '#F2A8C0',
  tv: '#7C8BB8',
  desk: '#C6A87C',
  bookshelf: '#B98F6A',
  plant: '#7FC8A9',
  lamp: '#F7C568',
  rug: '#EBC8B0',
  piano: '#8D7BA8',
  treadmill: '#9AA5B1',
  mirror: '#BFD8E8',
  painting: '#E8A87C',
  bench: '#B98F6A',
  catBed: '#F2A8C0',
  coffeeTable: '#C6A87C',
};

export function HousePreview({ grid = HOUSE_GRID, items = [], className }: HousePreviewProps) {
  const { t } = useTranslation();
  const cols = grid[0]?.length ?? 22;
  const rows = grid.length;
  const cells = useMemo(() => {
    const list: { x: number; y: number; wall: boolean }[] = [];
    grid.forEach((row, y) => {
      Array.from(row).forEach((char, x) => {
        list.push({ x, y, wall: char === '1' });
      });
    });
    return list;
  }, [grid]);

  return (
    <svg
      className={className}
      viewBox={`-1 -1 ${cols + 2} ${rows + 2}`}
      role="img"
      aria-label={t('cards.floorPlan')}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={-1} y={-1} width={cols + 2} height={rows + 2} rx={2.4} fill="#FFF3E2" />
      <rect x={0.3} y={0.3} width={cols - 0.6} height={rows - 0.6} rx={1.6} fill="#FFFDF6" />
      {cells
        .filter((cell) => cell.wall)
        .map((cell) => (
          <rect
            key={`w-${cell.x}-${cell.y}`}
            x={cell.x}
            y={cell.y}
            width={1}
            height={1}
            fill="#E7D4BE"
          />
        ))}
      {items.map((placement) => {
        const item = itemById(placement.itemId);
        if (!item) return null;
        return (
          <rect
            key={placement.id}
            x={placement.x + 0.12}
            y={placement.y + 0.12}
            width={item.size.w - 0.24}
            height={item.size.h - 0.24}
            rx={0.4}
            fill={ROOM_COLORS[placement.itemId] ?? '#D9C6B4'}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}
