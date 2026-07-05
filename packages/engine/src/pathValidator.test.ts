import { describe, expect, it } from 'vitest';
import { areAdjacent, validatePath, wordFromPath, letterCountFromPath } from '../src/pathValidator.js';
import type { Tile } from '@marioggle/shared';

const sampleGrid: Tile[] = Array.from({ length: 25 }, (_, i) => ({
  index: i,
  display: 'A',
  letterCount: 1,
}));
sampleGrid[0] = { index: 0, display: 'C', letterCount: 1 };
sampleGrid[1] = { index: 1, display: 'A', letterCount: 1 };
sampleGrid[5] = { index: 5, display: 'T', letterCount: 1 };

describe('pathValidator', () => {
  it('detects horizontal adjacency', () => {
    expect(areAdjacent(0, 1)).toBe(true);
  });

  it('detects diagonal adjacency', () => {
    expect(areAdjacent(0, 6)).toBe(true);
  });

  it('rejects non-adjacent tiles', () => {
    expect(areAdjacent(0, 2)).toBe(false);
  });

  it('allows direction changes', () => {
    expect(validatePath([0, 1, 5]).valid).toBe(true);
  });

  it('rejects tile reuse within word', () => {
    expect(validatePath([0, 1, 0]).valid).toBe(false);
  });

  it('builds word from path', () => {
    expect(wordFromPath(sampleGrid, [0, 1, 5])).toBe('cat');
  });
});

describe('Qu behaviour', () => {
  const quGrid: Tile[] = Array.from({ length: 25 }, (_, i) => ({
    index: i,
    display: 'A',
    letterCount: 1,
  }));
  quGrid[0] = { index: 0, display: 'Qu', letterCount: 2 };
  quGrid[1] = { index: 1, display: 'I', letterCount: 1 };
  quGrid[2] = { index: 2, display: 'T', letterCount: 1 };

  it('Qu counts as two letters', () => {
    expect(letterCountFromPath(quGrid, [0, 1, 2])).toBe(4);
  });
});
