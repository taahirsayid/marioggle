import { describe, expect, it } from 'vitest';
import { BIG_BOGGLE_DICE, mulberry32, rollBigBoggleGrid } from './boggleDice.js';

describe('BIG_BOGGLE_DICE', () => {
  it('has 25 official dice', () => {
    expect(BIG_BOGGLE_DICE).toHaveLength(25);
  });
});

describe('rollBigBoggleGrid', () => {
  it('produces 25 tiles with valid indices', () => {
    const tiles = rollBigBoggleGrid(42);
    expect(tiles).toHaveLength(25);
    tiles.forEach((tile, index) => {
      expect(tile.index).toBe(index);
      expect(tile.display.length).toBeGreaterThan(0);
      expect(tile.letterCount).toBeGreaterThanOrEqual(1);
    });
  });

  it('maps Q to Qu (two letter count)', () => {
    let foundQu = false;
    for (let seed = 0; seed < 100; seed++) {
      const tiles = rollBigBoggleGrid(seed);
      for (const tile of tiles) {
        if (tile.display === 'Qu') {
          foundQu = true;
          expect(tile.letterCount).toBe(2);
        } else {
          expect(tile.display).not.toBe('Q');
        }
      }
    }
    expect(foundQu).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const a = rollBigBoggleGrid(12345);
    const b = rollBigBoggleGrid(12345);
    expect(a.map((t) => t.display)).toEqual(b.map((t) => t.display));
  });

  it('varies across seeds', () => {
    const a = rollBigBoggleGrid(1).map((t) => t.display).join('');
    const b = rollBigBoggleGrid(2).map((t) => t.display).join('');
    expect(a).not.toBe(b);
  });
});

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 20; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
