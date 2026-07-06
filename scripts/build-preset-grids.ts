/**
 * Offline preset grid library (D1).
 * Rolls Big Boggle dice (A2), picks richest of K candidates (B2), stores solutions.
 *
 * Usage: npm run build:preset-grids
 * Env:   PRESET_GRID_COUNT (default 150), PRESET_CANDIDATES_K (default 8)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRichDiceBoard } from '../packages/engine/src/boardSelection.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRID_WORDS = join(root, 'apps/server/data/grid-words.json');
const OUT_PATHS = [
  join(root, 'packages/engine/data/presetGrids.json'),
  join(root, 'apps/server/data/presetGrids.json'),
];

const COUNT = Number(process.env.PRESET_GRID_COUNT ?? 150);
const K = Number(process.env.PRESET_CANDIDATES_K ?? 8);
/** Calibrated for grid-words.json (~575 lemmas), not full WordNet. */
const MIN_WORDS = Number(process.env.PRESET_MIN_WORDS ?? 28);
const RICHNESS_FLOOR = Number(process.env.PRESET_RICHNESS_FLOOR ?? 32);

function loadGridDictionary() {
  const data = JSON.parse(readFileSync(GRID_WORDS, 'utf-8')) as {
    words: string[];
    offensive?: string[];
  };
  const words = new Set(data.words.map((w) => w.toLowerCase()));
  const offensive = new Set((data.offensive ?? []).map((w) => w.toLowerCase()));
  return {
    has: (word: string) => words.has(word.toLowerCase()),
    isOffensive: (word: string) => offensive.has(word.toLowerCase()),
  };
}

function buildOneGrid(baseSeed: number, dictionary: ReturnType<typeof loadGridDictionary>) {
  for (let retry = 0; retry < 25; retry++) {
    const seed = baseSeed + retry * 1337;
    const board = generateRichDiceBoard(seed, dictionary, {
      k: K,
      floor: RICHNESS_FLOOR,
    });
    if (board.solutions.length >= MIN_WORDS) {
      return board;
    }
  }
  throw new Error(`Failed to qualify grid for base seed ${baseSeed}`);
}

const dictionary = loadGridDictionary();
const grids = [];
const started = Date.now();

console.log(`Building ${COUNT} preset grids (k=${K}, floor=${RICHNESS_FLOOR}, minWords=${MIN_WORDS})...`);

for (let i = 0; i < COUNT; i++) {
  const baseSeed = 1_000_000 + i * 100_003;
  const board = buildOneGrid(baseSeed, dictionary);
  grids.push({
    seed: board.seed,
    tiles: board.tiles,
    solutions: board.solutions,
    richness: board.richness,
  });
  if ((i + 1) % 10 === 0 || i === COUNT - 1) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  ${i + 1}/${COUNT} — ${board.solutions.length} words, richness ${board.richness} (${elapsed}s)`,
    );
  }
}

const library = {
  version: 1,
  count: grids.length,
  generatedAt: new Date().toISOString(),
  dice: 'big-boggle-25',
  k: K,
  richnessFloor: RICHNESS_FLOOR,
  minWords: MIN_WORDS,
  grids,
};

const json = JSON.stringify(library);

for (const outPath of OUT_PATHS) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, 'utf-8');
  console.log(`Wrote ${grids.length} grids (${(json.length / 1024).toFixed(0)} KB) → ${outPath}`);
}

console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
