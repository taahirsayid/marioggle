import type { Tile } from '@marioggle/shared';
import { MIN_WORD_LENGTH } from '@marioggle/shared';
import {
  applyInvalidPenalty,
  scoreForWordLength,
} from '@marioggle/shared';
import type { SubmitWordResult, WordOutcome } from '@marioggle/shared';
import {
  letterCountFromPath,
  validatePath,
  wordFromPath,
} from './pathValidator.js';

export type Dictionary = {
  has: (word: string) => boolean;
  isOffensive: (word: string) => boolean;
};

export type SubmitWordInput = {
  grid: Tile[];
  path: number[];
  foundWords: Set<string>;
  currentScore: number;
  dictionary: Dictionary;
  activeEndsAt: number;
  receivedAt: number;
};

export function submitWord(input: SubmitWordInput): SubmitWordResult {
  const {
    grid,
    path,
    foundWords,
    currentScore,
    dictionary,
    activeEndsAt,
    receivedAt,
  } = input;

  if (receivedAt > activeEndsAt) {
    return {
      outcome: 'rejected_late',
      pointsDelta: 0,
      totalScore: currentScore,
      message: 'Invalid word',
    };
  }

  const pathResult = validatePath(path);
  if (!pathResult.valid) {
    const totalScore = applyInvalidPenalty(currentScore);
    return {
      outcome: 'invalid',
      pointsDelta: totalScore - currentScore,
      totalScore,
      message: 'Invalid word',
    };
  }

  const word = wordFromPath(grid, path);
  const letterCount = letterCountFromPath(grid, path);

  if (letterCount < MIN_WORD_LENGTH) {
    const totalScore = applyInvalidPenalty(currentScore);
    return {
      outcome: 'invalid',
      word,
      pointsDelta: totalScore - currentScore,
      totalScore,
      message: 'Invalid word',
    };
  }

  if (foundWords.has(word)) {
    return {
      outcome: 'duplicate',
      word,
      pointsDelta: 0,
      totalScore: currentScore,
      message: 'Already found',
    };
  }

  if (!dictionary.has(word) || dictionary.isOffensive(word)) {
    const totalScore = applyInvalidPenalty(currentScore);
    return {
      outcome: 'invalid',
      word,
      pointsDelta: totalScore - currentScore,
      totalScore,
      message: 'Invalid word',
    };
  }

  const points = scoreForWordLength(letterCount);
  return {
    outcome: 'accepted',
    word,
    pointsDelta: points,
    totalScore: currentScore + points,
    message: 'Valid word',
  };
}

export function outcomeMessage(outcome: WordOutcome): string {
  switch (outcome) {
    case 'duplicate':
      return 'Already found';
    case 'accepted':
      return 'Valid word';
    default:
      return 'Invalid word';
  }
}
