import { describe, expect, it } from 'vitest';
import { scoreForWordLength, applyInvalidPenalty } from '../src/scoring.js';

describe('scoring', () => {
  it('every scoring band', () => {
    expect(scoreForWordLength(3)).toBe(1);
    expect(scoreForWordLength(4)).toBe(1);
    expect(scoreForWordLength(5)).toBe(2);
    expect(scoreForWordLength(6)).toBe(3);
    expect(scoreForWordLength(7)).toBe(5);
    expect(scoreForWordLength(8)).toBe(11);
    expect(scoreForWordLength(15)).toBe(11);
  });

  it('zero-point floor', () => {
    expect(applyInvalidPenalty(0)).toBe(0);
  });
});
