import type { Tile } from '@marioggle/shared';
import { GRID_SIZE } from '@marioggle/shared';

export function indexToRowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

export function rowColToIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

/** 8-direction adjacency including diagonals (BR-PLAY-003). */
export function areAdjacent(a: number, b: number): boolean {
  const { row: r1, col: c1 } = indexToRowCol(a);
  const { row: r2, col: c2 } = indexToRowCol(b);
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && a !== b;
}

export function validatePath(path: number[]): { valid: boolean; reason?: string } {
  if (path.length === 0) return { valid: false, reason: 'empty' };
  for (const idx of path) {
    if (idx < 0 || idx >= 25) return { valid: false, reason: 'out_of_bounds' };
  }
  const seen = new Set<number>();
  for (const idx of path) {
    if (seen.has(idx)) return { valid: false, reason: 'tile_reused' };
    seen.add(idx);
  }
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) {
      return { valid: false, reason: 'not_adjacent' };
    }
  }
  return { valid: true };
}

export function wordFromPath(grid: Tile[], path: number[]): string {
  return path.map((i) => grid[i].display).join('').toLowerCase();
}

export function letterCountFromPath(grid: Tile[], path: number[]): number {
  return path.reduce((sum, i) => sum + grid[i].letterCount, 0);
}

export function getAdjacencyList(): number[][] {
  const adj: number[][] = Array.from({ length: 25 }, () => []);
  for (let a = 0; a < 25; a++) {
    for (let b = 0; b < 25; b++) {
      if (areAdjacent(a, b)) adj[a].push(b);
    }
  }
  return adj;
}
