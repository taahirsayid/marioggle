import type { Tile } from '@marioggle/shared';
import type { SolutionWord } from './gridQualifier.js';

export type PresetGrid = {
  seed: number;
  tiles: Tile[];
  solutions: SolutionWord[];
};

function tile(index: number, display: string, letterCount = 1): Tile {
  return { index, display, letterCount };
}

/** Pre-built boards — zero CPU at game start (required for Render free tier). */
export const PRESET_GRIDS: PresetGrid[] = [
  {
    seed: 1001,
    tiles: [
      tile(0, 'S'), tile(1, 'T'), tile(2, 'O'), tile(3, 'N'), tile(4, 'E'),
      tile(5, 'P'), tile(6, 'A'), tile(7, 'R'), tile(8, 'E'), tile(9, 'S'),
      tile(10, 'O'), tile(11, 'R'), tile(12, 'E'), tile(13, 'S'), tile(14, 'T'),
      tile(15, 'T'), tile(16, 'E'), tile(17, 'A'), tile(18, 'M'), tile(19, 'S'),
      tile(20, 'S'), tile(21, 'T'), tile(22, 'A'), tile(23, 'R'), tile(24, 'E'),
    ],
    solutions: [
      { word: 'stone', path: [0, 1, 2, 3, 4], letterCount: 5 },
      { word: 'store', path: [0, 1, 2, 7, 8], letterCount: 5 },
      { word: 'stare', path: [20, 21, 22, 23, 24], letterCount: 5 },
      { word: 'star', path: [20, 21, 22, 23], letterCount: 4 },
      { word: 'team', path: [16, 17, 18, 19], letterCount: 4 },
      { word: 'tea', path: [15, 16, 17], letterCount: 3 },
      { word: 'pare', path: [5, 6, 7, 8], letterCount: 4 },
      { word: 'pares', path: [5, 6, 7, 8, 9], letterCount: 5 },
      { word: 'ore', path: [10, 11, 12], letterCount: 3 },
      { word: 'rest', path: [8, 9, 13, 14], letterCount: 4 },
      { word: 'rate', path: [7, 6, 16, 17], letterCount: 4 },
      { word: 'ate', path: [17, 18, 24], letterCount: 3 },
      { word: 'art', path: [22, 23, 14], letterCount: 3 },
      { word: 'ear', path: [8, 6, 7], letterCount: 3 },
      { word: 'eat', path: [17, 16, 15], letterCount: 3 },
      { word: 'sea', path: [9, 8, 6], letterCount: 3 },
      { word: 'seat', path: [9, 8, 6, 15], letterCount: 4 },
      { word: 'nest', path: [3, 4, 9, 14], letterCount: 4 },
      { word: 'net', path: [3, 4, 9], letterCount: 3 },
      { word: 'ten', path: [15, 16, 3], letterCount: 3 },
      { word: 'port', path: [5, 10, 11, 14], letterCount: 4 },
      { word: 'post', path: [5, 10, 13, 14], letterCount: 4 },
      { word: 'rose', path: [7, 11, 12, 8], letterCount: 4 },
      { word: 'tore', path: [14, 11, 12, 8], letterCount: 4 },
    ],
  },
  {
    seed: 1002,
    tiles: [
      tile(0, 'C'), tile(1, 'A'), tile(2, 'T'), tile(3, 'S'), tile(4, 'E'),
      tile(5, 'A'), tile(6, 'R'), tile(7, 'E'), tile(8, 'N'), tile(9, 'T'),
      tile(10, 'T'), tile(11, 'E'), tile(12, 'A'), tile(13, 'R'), tile(14, 'S'),
      tile(15, 'S'), tile(16, 'T'), tile(17, 'O'), tile(18, 'N'), tile(19, 'E'),
      tile(20, 'R'), tile(21, 'A'), tile(22, 'I'), tile(23, 'N'), tile(24, 'S'),
    ],
    solutions: [
      { word: 'cat', path: [0, 1, 2], letterCount: 3 },
      { word: 'cats', path: [0, 1, 2, 3], letterCount: 4 },
      { word: 'care', path: [0, 1, 6, 7], letterCount: 4 },
      { word: 'cart', path: [0, 1, 6, 9], letterCount: 4 },
      { word: 'rate', path: [6, 1, 2, 7], letterCount: 4 },
      { word: 'rain', path: [21, 22, 12, 23], letterCount: 4 },
      { word: 'train', path: [9, 13, 12, 22, 23], letterCount: 5 },
      { word: 'stone', path: [16, 17, 18, 19, 14], letterCount: 5 },
      { word: 'tone', path: [16, 17, 18, 19], letterCount: 4 },
      { word: 'note', path: [18, 17, 11, 7], letterCount: 4 },
      { word: 'nest', path: [8, 7, 13, 9], letterCount: 4 },
      { word: 'net', path: [8, 7, 9], letterCount: 3 },
      { word: 'ten', path: [9, 7, 8], letterCount: 3 },
      { word: 'tea', path: [11, 12, 1], letterCount: 3 },
      { word: 'eat', path: [7, 11, 9], letterCount: 3 },
      { word: 'ear', path: [7, 11, 6], letterCount: 3 },
      { word: 'art', path: [6, 13, 9], letterCount: 3 },
      { word: 'star', path: [3, 13, 6, 7], letterCount: 4 },
      { word: 'tare', path: [10, 12, 6, 7], letterCount: 4 },
      { word: 'rant', path: [6, 1, 8, 9], letterCount: 4 },
      { word: 'rains', path: [21, 22, 12, 23, 24], letterCount: 5 },
      { word: 'seat', path: [3, 7, 11, 9], letterCount: 4 },
      { word: 'sent', path: [14, 7, 8, 9], letterCount: 4 },
    ],
  },
  {
    seed: 1003,
    tiles: [
      tile(0, 'B'), tile(1, 'R'), tile(2, 'E'), tile(3, 'A'), tile(4, 'D'),
      tile(5, 'L'), tile(6, 'I'), tile(7, 'N'), tile(8, 'E'), tile(9, 'S'),
      tile(10, 'W'), tile(11, 'O'), tile(12, 'R'), tile(13, 'D'), tile(14, 'S'),
      tile(15, 'S'), tile(16, 'A'), tile(17, 'N'), tile(18, 'D'), tile(19, 'S'),
      tile(20, 'Q'), tile(21, 'U'), tile(22, 'I'), tile(23, 'T'), tile(24, 'E'),
    ],
    solutions: [
      { word: 'bread', path: [0, 1, 2, 3, 4], letterCount: 5 },
      { word: 'read', path: [1, 2, 3, 4], letterCount: 4 },
      { word: 'line', path: [5, 6, 7, 8], letterCount: 4 },
      { word: 'lines', path: [5, 6, 7, 8, 9], letterCount: 5 },
      { word: 'word', path: [10, 11, 12, 13], letterCount: 4 },
      { word: 'words', path: [10, 11, 12, 13, 14], letterCount: 5 },
      { word: 'sand', path: [15, 16, 17, 18], letterCount: 4 },
      { word: 'sands', path: [15, 16, 17, 18, 19], letterCount: 5 },
      { word: 'quit', path: [20, 21, 22, 23], letterCount: 4 },
      { word: 'quite', path: [20, 21, 22, 23, 24], letterCount: 5 },
      { word: 'bear', path: [0, 2, 3, 12], letterCount: 4 },
      { word: 'bead', path: [0, 2, 3, 4], letterCount: 4 },
      { word: 'wine', path: [10, 6, 7, 8], letterCount: 4 },
      { word: 'wore', path: [10, 11, 12, 8], letterCount: 4 },
      { word: 'and', path: [16, 17, 18], letterCount: 3 },
      { word: 'end', path: [8, 7, 18], letterCount: 3 },
      { word: 'ran', path: [12, 16, 17], letterCount: 3 },
      { word: 'red', path: [1, 2, 13], letterCount: 3 },
      { word: 'rod', path: [12, 11, 13], letterCount: 3 },
      { word: 'lid', path: [6, 7, 18], letterCount: 3 },
      { word: 'sad', path: [15, 16, 18], letterCount: 3 },
      { word: 'bad', path: [0, 16, 18], letterCount: 3 },
    ],
  },
  {
    seed: 1004,
    tiles: [
      tile(0, 'G'), tile(1, 'R'), tile(2, 'A'), tile(3, 'N'), tile(4, 'D'),
      tile(5, 'E'), tile(6, 'A'), tile(7, 'R'), tile(8, 'T'), tile(9, 'H'),
      tile(10, 'S'), tile(11, 'H'), tile(12, 'O'), tile(13, 'R'), tile(14, 'E'),
      tile(15, 'T'), tile(16, 'I'), tile(17, 'M'), tile(18, 'E'), tile(19, 'S'),
      tile(20, 'P'), tile(21, 'L'), tile(22, 'A'), tile(23, 'N'), tile(24, 'E'),
    ],
    solutions: [
      { word: 'grand', path: [0, 1, 2, 3, 4], letterCount: 5 },
      { word: 'earth', path: [5, 6, 7, 8, 9], letterCount: 5 },
      { word: 'shore', path: [10, 11, 12, 13, 14], letterCount: 5 },
      { word: 'times', path: [15, 16, 17, 18, 19], letterCount: 5 },
      { word: 'plane', path: [20, 21, 22, 23, 24], letterCount: 5 },
      { word: 'plan', path: [20, 21, 22, 23], letterCount: 4 },
      { word: 'grain', path: [0, 1, 2, 16, 23], letterCount: 5 },
      { word: 'grant', path: [0, 1, 2, 3, 8], letterCount: 5 },
      { word: 'heart', path: [9, 6, 7, 8, 15], letterCount: 5 },
      { word: 'hear', path: [9, 6, 7, 8], letterCount: 4 },
      { word: 'time', path: [15, 16, 17, 18], letterCount: 4 },
      { word: 'art', path: [6, 7, 8], letterCount: 3 },
      { word: 'rat', path: [7, 6, 15], letterCount: 3 },
      { word: 'hat', path: [11, 6, 15], letterCount: 3 },
      { word: 'hot', path: [11, 12, 8], letterCount: 3 },
      { word: 'ore', path: [12, 13, 14], letterCount: 3 },
      { word: 'ran', path: [1, 6, 3], letterCount: 3 },
      { word: 'and', path: [2, 3, 4], letterCount: 3 },
      { word: 'ear', path: [6, 7, 13], letterCount: 3 },
      { word: 'eat', path: [18, 6, 15], letterCount: 3 },
      { word: 'sea', path: [10, 6, 5], letterCount: 3 },
      { word: 'she', path: [10, 11, 6], letterCount: 3 },
      { word: 'her', path: [11, 6, 7], letterCount: 3 },
    ],
  },
];

export function pickPresetGrid(seed: number): PresetGrid {
  const preset = PRESET_GRIDS[Math.abs(seed) % PRESET_GRIDS.length]!;
  return { ...preset, seed };
}
