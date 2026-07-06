import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tile } from '@marioggle/shared';
import type { SolutionWord } from './gridQualifier.js';

export type PresetGrid = {
  seed: number;
  tiles: Tile[];
  solutions: SolutionWord[];
  richness?: number;
};

export type PresetGridLibrary = {
  version: number;
  count: number;
  grids: PresetGrid[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));

function presetGridPaths(): string[] {
  const cwd = process.cwd();
  return [
    join(__dirname, '../data/presetGrids.json'),
    join(__dirname, '../../data/presetGrids.json'),
    join(cwd, 'packages/engine/data/presetGrids.json'),
    join(cwd, 'apps/server/data/presetGrids.json'),
    join(cwd, 'apps/server/dist/data/presetGrids.json'),
  ];
}

let cachedLibrary: PresetGrid[] | null = null;

function loadPresetLibrary(): PresetGrid[] {
  if (cachedLibrary) return cachedLibrary;

  for (const path of presetGridPaths()) {
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as PresetGridLibrary | PresetGrid[];
    const grids = Array.isArray(raw) ? raw : raw.grids;
    if (grids.length === 0) continue;
    cachedLibrary = grids;
    return grids;
  }

  throw new Error(
    'presetGrids.json not found. Run: npm run build:preset-grids',
  );
}

export function getPresetGridCount(): number {
  return loadPresetLibrary().length;
}

export function pickPresetGrid(seed: number): PresetGrid {
  const library = loadPresetLibrary();
  const index = Math.abs(seed) % library.length;
  const preset = library[index]!;
  return { ...preset, seed };
}

/** @internal Test helper — clears cached library between tests. */
export function resetPresetGridCache(): void {
  cachedLibrary = null;
}
