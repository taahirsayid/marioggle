import { describe, expect, it } from 'vitest';
import { extendPath, areAdjacent, isWithinHotZone } from './swipePath';

describe('extendPath', () => {
  it('starts a path', () => {
    expect(extendPath([], 5)).toEqual([5]);
  });

  it('appends adjacent unused cell', () => {
    expect(extendPath([5], 6)).toEqual([5, 6]);
  });

  it('appends diagonally adjacent cell', () => {
    expect(extendPath([6], 0)).toEqual([6, 0]);
  });

  it('ignores non-adjacent cell', () => {
    expect(extendPath([5], 7)).toEqual([5]);
  });

  it('leaves path unchanged when same cell', () => {
    expect(extendPath([5, 6], 6)).toEqual([5, 6]);
  });

  it('backtracks when returning to the previous cell', () => {
    expect(extendPath([5, 6, 7], 6)).toEqual([5, 6]);
  });

  it('backtracks to any earlier cell', () => {
    expect(extendPath([5, 6, 7], 5)).toEqual([5]);
    expect(extendPath([5, 6, 7, 11], 6)).toEqual([5, 6]);
  });
});

describe('areAdjacent', () => {
  it('accepts orthogonal neighbors', () => {
    expect(areAdjacent(7, 8)).toBe(true);
  });

  it('accepts diagonal neighbors', () => {
    expect(areAdjacent(7, 13)).toBe(true);
  });

  it('rejects distant cells', () => {
    expect(areAdjacent(0, 2)).toBe(false);
  });
});

describe('isWithinHotZone', () => {
  const rect = new DOMRect(100, 100, 80, 80);

  it('accepts the cell center', () => {
    expect(isWithinHotZone(140, 140, rect)).toBe(true);
  });

  it('rejects points outside the hot zone near edges', () => {
    expect(isWithinHotZone(170, 140, rect)).toBe(false);
  });
});
