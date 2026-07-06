import type { Tile } from '@marioggle/shared';
import { rollBigBoggleGrid } from './boggleDice.js';
import { findAllSolutionWords, type SolutionWord } from './gridQualifier.js';
import type { Dictionary } from './wordValidator.js';

export type GeneratedDiceBoard = {
  tiles: Tile[];
  seed: number;
  solutions: SolutionWord[];
  richness: number;
};

export type PickRichestBoardOptions<G> = {
  generate: () => G;
  score: (candidate: G) => number;
  k: number;
  floor?: number;
};

/** Generate K candidates and return the highest-scoring board (boggle-new style). */
export function pickRichestBoard<G>(opts: PickRichestBoardOptions<G>): G {
  const { generate, score, k, floor } = opts;
  if (k <= 1) return generate();

  let best: G | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < k; i++) {
    const candidate = generate();
    const candidateScore = score(candidate);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      best = candidate;
    }
    if (floor !== undefined && candidateScore >= floor) {
      return candidate;
    }
  }

  return best!;
}

/** Word-count richness with bonuses for longer words. */
export function scoreBoardRichness(solutions: SolutionWord[]): number {
  let score = solutions.length;
  for (const s of solutions) {
    if (s.letterCount >= 6) score += 2;
    if (s.letterCount >= 7) score += 3;
    if (s.letterCount >= 8) score += 5;
  }
  return score;
}

/** Minimum richness for a 5×5 English board (~110 words, boggle-new). */
export function richnessFloor(rows: number, cols: number): number {
  const area = rows * cols;
  if (area <= 16) return 60;
  if (area <= 25) return 110;
  if (area <= 36) return 200;
  return 300;
}

export type GenerateRichDiceBoardOptions = {
  k?: number;
  floor?: number;
};

/**
 * Roll Big Boggle dice K times and keep the richest qualifying board.
 * Each attempt uses seed + attempt * 7919 for independent rolls.
 */
export function generateRichDiceBoard(
  seed: number,
  dictionary: Dictionary,
  options: GenerateRichDiceBoardOptions = {},
): GeneratedDiceBoard {
  const k = options.k ?? 8;
  const floor = options.floor ?? richnessFloor(5, 5);
  let attempt = 0;

  const result = pickRichestBoard({
    k,
    floor,
    generate: () => {
      const attemptSeed = seed + attempt * 7919;
      attempt++;
      const tiles = rollBigBoggleGrid(attemptSeed);
      const solutions = findAllSolutionWords(tiles, dictionary);
      return { tiles, seed: attemptSeed, solutions };
    },
    score: (candidate) => scoreBoardRichness(candidate.solutions),
  });

  return {
    ...result,
    richness: scoreBoardRichness(result.solutions),
  };
}
