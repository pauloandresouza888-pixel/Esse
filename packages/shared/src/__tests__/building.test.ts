import { describe, expect, it } from 'vitest';
import {
  buyItem,
  canPlace,
  findFreeSpot,
  footprintOf,
  itemById,
  placementFromExtra,
  takeFromInventory,
  STORE_ITEMS,
  type ExtraPlacement,
} from '../index';

describe('store', () => {
  it('debits the price and adds the item to the inventory', () => {
    const result = buyItem('sofa', 400, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.money).toBe(400 - (itemById('sofa')?.price ?? 0));
    expect(result.inventory).toEqual(['sofa']);
  });

  it('blocks purchases above the balance', () => {
    const result = buyItem('piano', 100, []);
    expect(result).toEqual({ ok: false, reason: 'not-enough-money' });
  });

  it('refuses unknown items and keeps the inventory untouched', () => {
    expect(buyItem('spaceship', 999, ['lamp'])).toEqual({ ok: false, reason: 'unknown-item' });
    expect(takeFromInventory(['lamp', 'rug'], 'spaceship')).toBeNull();
    expect(takeFromInventory(['lamp', 'rug'], 'rug')).toEqual(['lamp']);
  });
});

describe('placement', () => {
  it('places a free spot on an empty cell', () => {
    const extra: ExtraPlacement = { id: 'extra-1', itemId: 'lamp', x: 6, y: 6 };
    expect(canPlace(extra, [])).toBe(true);
  });

  it('refuses to place on top of the bed or outside the room', () => {
    const onBed: ExtraPlacement = { id: 'extra-1', itemId: 'lamp', x: 2, y: 1 };
    expect(canPlace(onBed, [])).toBe(false);
    expect(canPlace({ id: 'x', itemId: 'lamp', x: 0, y: 6 }, [])).toBe(false);
    expect(canPlace({ id: 'x', itemId: 'lamp', x: 21, y: 6 }, [])).toBe(false);
    expect(canPlace({ id: 'x', itemId: 'lamp', x: 6, y: 15 }, [])).toBe(false);
  });

  it('refuses overlapping extras', () => {
    const first: ExtraPlacement = { id: 'extra-1', itemId: 'sofa', x: 6, y: 6 };
    expect(canPlace({ id: 'extra-2', itemId: 'lamp', x: 7, y: 6 }, [first])).toBe(false);
  });

  it('finds a free spot for any catalog item', () => {
    for (const item of STORE_ITEMS) {
      const spot = findFreeSpot(item.id, []);
      expect(spot, item.id).not.toBeNull();
      expect(canPlace(spot!, [])).toBe(true);
    }
  });

  it('caps custom furniture at 200 pieces', () => {
    const full = Array.from({ length: 200 }, (_, index) => ({
      id: `extra-${index + 1}`, itemId: 'lamp', x: 2, y: 2,
    }));
    expect(canPlace({ id: 'extra-201', itemId: 'lamp', x: 6, y: 6 }, full)).toBe(false);
    expect(findFreeSpot('lamp', full)).toBeNull();
  });

  it('derives footprint and label from the catalog', () => {
    const placement = placementFromExtra({ id: 'extra-9', itemId: 'piano', x: 5, y: 5 })!;
    expect(placement.labelKey).toBe('items.piano');
    const item = itemById('piano')!;
    expect(placement.footprint).toEqual(footprintOf(item));
    expect(placement.footprint.w).toBeGreaterThan(1);
  });
});
