import { describe, expect, it } from 'vitest';
import { scoreForWordLength, applyInvalidPenalty } from '@marioggle/shared';
import { submitWord } from '../src/wordValidator.js';
import { TrieDictionary } from '../src/trie.js';
import type { Tile } from '@marioggle/shared';

const dict = TrieDictionary.fromWordList(['cat', 'cats', 'running', 'run']);

function makeGrid(word: string, path: number[]): Tile[] {
  const tiles: Tile[] = Array.from({ length: 25 }, (_, i) => ({
    index: i,
    display: 'A',
    letterCount: 1,
  }));
  for (let i = 0; i < path.length; i++) {
    tiles[path[i]] = {
      index: path[i],
      display: word[i].toUpperCase(),
      letterCount: 1,
    };
  }
  return tiles;
}

describe('scoring bands', () => {
  it('scores 3-4 letter words as 1 point', () => {
    expect(scoreForWordLength(3)).toBe(1);
    expect(scoreForWordLength(4)).toBe(1);
  });

  it('scores 5 letter words as 2', () => {
    expect(scoreForWordLength(5)).toBe(2);
  });

  it('scores 8+ as 11', () => {
    expect(scoreForWordLength(8)).toBe(11);
    expect(scoreForWordLength(12)).toBe(11);
  });
});

describe('submitWord', () => {
  const grid = makeGrid('cat', [0, 1, 2]);
  const endsAt = Date.now() + 60000;

  it('accepts valid word', () => {
    const result = submitWord({
      grid,
      path: [0, 1, 2],
      foundWords: new Set(),
      currentScore: 0,
      dictionary: dict,
      activeEndsAt: endsAt,
      receivedAt: Date.now(),
    });
    expect(result.outcome).toBe('accepted');
    expect(result.totalScore).toBe(1);
  });

  it('handles duplicate without penalty', () => {
    const result = submitWord({
      grid,
      path: [0, 1, 2],
      foundWords: new Set(['cat']),
      currentScore: 1,
      dictionary: dict,
      activeEndsAt: endsAt,
      receivedAt: Date.now(),
    });
    expect(result.outcome).toBe('duplicate');
    expect(result.totalScore).toBe(1);
    expect(result.message).toBe('Already found');
  });

  it('applies invalid penalty with zero floor', () => {
    const result = submitWord({
      grid,
      path: [0, 1, 2],
      foundWords: new Set(),
      currentScore: 0,
      dictionary: TrieDictionary.fromWordList([]),
      activeEndsAt: endsAt,
      receivedAt: Date.now(),
    });
    expect(result.outcome).toBe('invalid');
    expect(result.totalScore).toBe(0);
  });

  it('rejects late submission', () => {
    const result = submitWord({
      grid,
      path: [0, 1, 2],
      foundWords: new Set(),
      currentScore: 0,
      dictionary: dict,
      activeEndsAt: Date.now() - 1,
      receivedAt: Date.now(),
    });
    expect(result.outcome).toBe('rejected_late');
  });
});

describe('score floor', () => {
  it('never goes below zero', () => {
    expect(applyInvalidPenalty(0)).toBe(0);
    expect(applyInvalidPenalty(1)).toBe(0);
  });
});
