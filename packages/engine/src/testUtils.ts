import type { Dictionary } from './wordValidator.js';

/** Minimal dictionary for unit tests. */
export function makeTestDictionary(words: string[]): Dictionary {
  const set = new Set(words.map((w) => w.toLowerCase()));
  return {
    has: (word: string) => set.has(word.toLowerCase()),
    isOffensive: () => false,
  };
}
