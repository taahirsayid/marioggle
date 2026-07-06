import { describe, expect, it, beforeAll } from 'vitest';
import { getPresetGridCount, pickPresetGrid, resetPresetGridCache } from './presetGrids.js';

beforeAll(() => {
  resetPresetGridCache();
});

describe('pickPresetGrid', () => {
  it('loads from preset library', () => {
    expect(getPresetGridCount()).toBeGreaterThanOrEqual(2);
    const grid = pickPresetGrid(99);
    expect(grid.tiles).toHaveLength(25);
    expect(grid.seed).toBe(99);
  });

  it('cycles deterministically by seed modulo pool size', () => {
    const count = getPresetGridCount();
    const a = pickPresetGrid(100).tiles.map((t) => t.display).join('');
    const b = pickPresetGrid(100 + count).tiles.map((t) => t.display).join('');
    expect(a).toBe(b);
  });
});
