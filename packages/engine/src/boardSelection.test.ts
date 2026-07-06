import { describe, expect, it } from 'vitest';
import { pickRichestBoard, scoreBoardRichness } from './boardSelection.js';
import type { SolutionWord } from './gridQualifier.js';

function solution(word: string, letterCount: number): SolutionWord {
  return { word, path: [0], letterCount };
}

describe('scoreBoardRichness', () => {
  it('counts words and bonuses long words', () => {
    const solutions = [
      solution('cat', 3),
      solution('stone', 5),
      solution('planet', 6),
      solution('training', 8),
    ];
    // 4 base + 2 (6+) + 2 (6+) + 3 (7+) + 5 (8+) for training
    expect(scoreBoardRichness(solutions)).toBe(16);
  });
});

describe('pickRichestBoard', () => {
  it('returns highest scoring candidate', () => {
    const best = pickRichestBoard({
      k: 5,
      generate: (() => {
        let n = 0;
        return () => ({ score: n++ });
      })(),
      score: (c) => c.score,
    });
    expect(best.score).toBe(4);
  });

  it('early exits when floor is met', () => {
    let attempts = 0;
    pickRichestBoard({
      k: 10,
      floor: 5,
      generate: () => {
        attempts++;
        return { score: attempts };
      },
      score: (c) => c.score,
    });
    expect(attempts).toBe(5);
  });
});
