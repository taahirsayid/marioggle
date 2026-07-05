#!/usr/bin/env tsx
/**
 * Builds dictionary.json from WordNet 3.1 (via wordnet-db npm package).
 * Extracts single-word lemmas from index.noun/verb/adj/adv files.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const OUT_DIR = join(process.cwd(), 'data');
const OUT_FILE = join(OUT_DIR, 'dictionary.json');
const SERVER_OUT = join(process.cwd(), 'apps/server/data/dictionary.json');

function loadOffensive(): string[] {
  const p = join(OUT_DIR, 'offensive-deny-list.txt');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8')
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

function isValidLemma(lemma: string): boolean {
  const w = lemma.toLowerCase().replace(/_/g, '');
  if (w.length < 3) return false;
  if (!/^[a-z]+$/.test(w)) return false;
  return true;
}

function normalizeLemma(lemma: string): string {
  return lemma.toLowerCase().replace(/_/g, '');
}

function findWordNetDictDir(): string {
  try {
    const wordnetDbPath = dirname(require.resolve('wordnet-db/package.json'));
    const dictDir = join(wordnetDbPath, 'dict');
    if (existsSync(dictDir)) return dictDir;
  } catch {
    // not installed
  }
  const fallbacks = [
    join(process.cwd(), 'node_modules/wordnet-db/dict'),
    join(process.cwd(), 'apps/server/node_modules/wordnet-db/dict'),
  ];
  for (const p of fallbacks) {
    if (existsSync(p)) return p;
  }
  throw new Error('wordnet-db dict folder not found. Run npm install wordnet-db');
}

function loadWordNetLemmas(dictDir: string): Set<string> {
  const words = new Set<string>();
  const indexFiles = readdirSync(dictDir).filter((f) => f.startsWith('index.'));

  for (const file of indexFiles) {
    const content = readFileSync(join(dictDir, file), 'utf-8');
    for (const line of content.split('\n')) {
      if (!line || line.startsWith(' ')) continue;
      const lemma = line.split(/\s+/)[0];
      if (!lemma || lemma.startsWith('(')) continue;
      if (isValidLemma(lemma)) {
        words.add(normalizeLemma(lemma));
      }
    }
  }

  return words;
}

/** Minimal fallback if WordNet package missing during local dev. */
const FALLBACK_WORDS = [
  'cat', 'cats', 'dog', 'dogs', 'run', 'runs', 'running', 'tea', 'eat', 'ate',
  'rate', 'tar', 'art', 'rat', 'star', 'arts', 'race', 'care', 'acre', 'react',
  'trace', 'cart', 'cast', 'cost', 'most', 'post', 'stop', 'tops', 'spot', 'port',
  'sort', 'core', 'toe', 'toes', 'set', 'net', 'ten', 'nets', 'nest', 'sent',
  'stone', 'notes', 'tones', 'onset', 'train', 'rain', 'air', 'tin', 'tan', 'ant',
  'ants', 'stand', 'sand', 'and', 'ads', 'sad', 'dart', 'road', 'rod', 'word',
  'words', 'team', 'mate', 'meat', 'tame', 'rest', 'rose', 'ore', 'line', 'lines',
  'lion', 'oil', 'one', 'ones', 'tone', 'note', 'son', 'sons', 'own', 'now', 'snow',
  'slow', 'low', 'sea', 'ease', 'east', 'seat', 'quit', 'quite', 'quote', 'quest',
  'equal', 'pen', 'pet', 'pets', 'step', 'steps', 'rent', 'term', 'met', 'err',
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(SERVER_OUT), { recursive: true });
  const offensive = loadOffensive();
  let words: Set<string>;

  try {
    const dictDir = findWordNetDictDir();
    words = loadWordNetLemmas(dictDir);
    if (words.size < 1000) {
      throw new Error(`WordNet returned only ${words.size} words`);
    }
    console.log(`Loaded ${words.size} lemmas from WordNet (${dictDir})`);
  } catch (err) {
    console.warn('WordNet load failed, using fallback list:', err);
    words = new Set(FALLBACK_WORDS);
  }

  const payload = JSON.stringify({ words: [...words].sort(), offensive, source: 'wordnet' });
  writeFileSync(OUT_FILE, payload);
  writeFileSync(SERVER_OUT, payload);
  console.log(`Wrote ${words.size} words to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
