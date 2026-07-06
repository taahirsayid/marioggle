import type { Tile } from '@marioggle/shared';

/** Official 25 Big Boggle dice (Hasbro / Princeton Algs4 BOGGLE_BIG). */
export const BIG_BOGGLE_DICE: readonly string[] = [
  'AAAFRS',
  'AAEEEE',
  'AAFIRS',
  'ADENNN',
  'AEEEEM',
  'AEEGMU',
  'AEGMNN',
  'AFIRSY',
  'BJKQXZ',
  'CCENST',
  'CEIILT',
  'CEILPT',
  'CEIPST',
  'DDHNOT',
  'DHHLOR',
  'DHLNOR',
  'DHLNOR',
  'EIIITT',
  'EMOTTT',
  'ENSSSU',
  'FIPRSY',
  'GORRVW',
  'IPRRRY',
  'NOOTUW',
  'OOOTTU',
] as const;

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function faceToTile(index: number, face: string): Tile {
  if (face === 'Q') {
    return { index, display: 'Qu', letterCount: 2 };
  }
  return { index, display: face, letterCount: 1 };
}

/** Shuffle dice to grid positions and pick a random face per die (seeded). */
export function rollBigBoggleGrid(seed: number): Tile[] {
  const rng = mulberry32(seed);
  const diceOrder = Array.from({ length: BIG_BOGGLE_DICE.length }, (_, i) => i);

  for (let i = diceOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [diceOrder[i], diceOrder[j]] = [diceOrder[j]!, diceOrder[i]!];
  }

  return diceOrder.map((dieIndex, gridIndex) => {
    const faces = BIG_BOGGLE_DICE[dieIndex]!;
    const face = faces[Math.floor(rng() * faces.length)]!;
    return faceToTile(gridIndex, face);
  });
}
