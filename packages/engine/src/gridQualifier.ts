import type { Tile } from '@marioggle/shared';
import { getAdjacencyList, letterCountFromPath, wordFromPath } from './pathValidator.js';
import type { Dictionary } from './wordValidator.js';

export type SolutionWord = {
  word: string;
  path: number[];
  letterCount: number;
};

const MAX_PATH_LENGTH = 16;

/** DFS enumerate all valid paths on grid (BR-GRID-005, BR-GRID-006). */
export function findAllSolutionWords(
  grid: Tile[],
  dictionary: Dictionary,
): SolutionWord[] {
  const adj = getAdjacencyList();
  const results: SolutionWord[] = [];
  const seen = new Set<string>();

  function dfs(path: number[], visited: number) {
    if (path.length > MAX_PATH_LENGTH) return;

    const word = wordFromPath(grid, path);
    const letterCount = letterCountFromPath(grid, path);

    if (letterCount >= 3 && dictionary.has(word) && !dictionary.isOffensive(word)) {
      const key = `${word}:${path.join(',')}`;
      if (!seen.has(word)) {
        seen.add(word);
        results.push({ word, path: [...path], letterCount });
      }
      void key;
    }

    const last = path[path.length - 1];
    for (const next of adj[last]) {
      if (visited & (1 << next)) continue;
      path.push(next);
      dfs(path, visited | (1 << next));
      path.pop();
    }
  }

  for (let start = 0; start < 25; start++) {
    dfs([start], 1 << start);
  }

  return results;
}

export function gridQualifies(solutions: SolutionWord[]): boolean {
  if (solutions.length < 20) return false;
  return solutions.some((s) => s.letterCount >= 6);
}
