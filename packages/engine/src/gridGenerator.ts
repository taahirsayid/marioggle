import type { Tile } from '@marioggle/shared';
import { findAllSolutionWords, gridQualifies } from './gridQualifier.js';
import type { Dictionary } from './wordValidator.js';

/** English letter frequencies (weighted bag) — BR-GRID-002. */
const LETTER_BAG: { token: string; weight: number; letterCount: number }[] = [
  { token: 'E', weight: 12, letterCount: 1 },
  { token: 'A', weight: 9, letterCount: 1 },
  { token: 'I', weight: 9, letterCount: 1 },
  { token: 'O', weight: 8, letterCount: 1 },
  { token: 'N', weight: 6, letterCount: 1 },
  { token: 'R', weight: 6, letterCount: 1 },
  { token: 'T', weight: 6, letterCount: 1 },
  { token: 'L', weight: 4, letterCount: 1 },
  { token: 'S', weight: 4, letterCount: 1 },
  { token: 'U', weight: 4, letterCount: 1 },
  { token: 'D', weight: 4, letterCount: 1 },
  { token: 'G', weight: 3, letterCount: 1 },
  { token: 'B', weight: 2, letterCount: 1 },
  { token: 'C', weight: 2, letterCount: 1 },
  { token: 'M', weight: 2, letterCount: 1 },
  { token: 'P', weight: 2, letterCount: 1 },
  { token: 'F', weight: 2, letterCount: 1 },
  { token: 'H', weight: 2, letterCount: 1 },
  { token: 'V', weight: 2, letterCount: 1 },
  { token: 'W', weight: 2, letterCount: 1 },
  { token: 'Y', weight: 2, letterCount: 1 },
  { token: 'K', weight: 1, letterCount: 1 },
  { token: 'J', weight: 1, letterCount: 1 },
  { token: 'X', weight: 1, letterCount: 1 },
  { token: 'Z', weight: 1, letterCount: 1 },
  { token: 'Qu', weight: 1, letterCount: 2 },
];

function buildWeightedBag(): { token: string; letterCount: number }[] {
  const bag: { token: string; letterCount: number }[] = [];
  for (const entry of LETTER_BAG) {
    for (let i = 0; i < entry.weight; i++) {
      bag.push({ token: entry.token, letterCount: entry.letterCount });
    }
  }
  return bag;
}

const WEIGHTED_BAG = buildWeightedBag();

export type GeneratedGrid = {
  tiles: Tile[];
  seed: number;
  solutions: ReturnType<typeof findAllSolutionWords>;
};

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGrid(seed: number, dictionary: Dictionary): GeneratedGrid {
  const rng = mulberry32(seed);
  let tiles: Tile[] = [];
  let solutions: ReturnType<typeof findAllSolutionWords> = [];

  for (let attempt = 0; attempt < 100; attempt++) {
    const attemptSeed = seed + attempt;
    const attemptRng = mulberry32(attemptSeed);
    tiles = Array.from({ length: 25 }, (_, index) => {
      const pick = WEIGHTED_BAG[Math.floor(attemptRng() * WEIGHTED_BAG.length)];
      return { index, display: pick.token, letterCount: pick.letterCount };
    });
    solutions = findAllSolutionWords(tiles, dictionary);
    if (gridQualifies(solutions)) {
      return { tiles, seed: attemptSeed, solutions };
    }
  }

  return { tiles, seed, solutions };
}

export async function generateQualifiedGridAsync(
  seed: number,
  dictionary: Dictionary,
): Promise<GeneratedGrid> {
  let tiles: Tile[] = [];
  let solutions: ReturnType<typeof findAllSolutionWords> = [];

  for (let attempt = 0; attempt < 50; attempt++) {
    const attemptSeed = seed + attempt;
    const attemptRng = mulberry32(attemptSeed);
    tiles = Array.from({ length: 25 }, (_, index) => {
      const pick = WEIGHTED_BAG[Math.floor(attemptRng() * WEIGHTED_BAG.length)];
      return { index, display: pick.token, letterCount: pick.letterCount };
    });
    solutions = findAllSolutionWords(tiles, dictionary);
    if (gridQualifies(solutions)) {
      return { tiles, seed: attemptSeed, solutions };
    }
    // Yield so health checks and other requests are not starved on free-tier CPUs.
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  return { tiles, seed, solutions };
}

export function generateQualifiedGrid(
  seed: number,
  dictionary: Dictionary,
): GeneratedGrid {
  return generateGrid(seed, dictionary);
}
