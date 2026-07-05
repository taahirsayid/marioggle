import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WordDictionary } from '@marioggle/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV_WORDS = [
  'cat', 'cats', 'dog', 'dogs', 'run', 'runs', 'running', 'tea', 'eat', 'rate',
  'star', 'trace', 'care', 'race', 'stone', 'notes', 'train', 'rain', 'stand',
  'sand', 'quit', 'quite', 'quote', 'quest', 'equal', 'line', 'lines', 'lion',
  'word', 'words', 'team', 'mate', 'rest', 'rose', 'ore', 'port', 'sort', 'stop',
  'net', 'ten', 'nest', 'sent', 'tone', 'note', 'one', 'son', 'own', 'now',
  'slow', 'sea', 'ease', 'east', 'seat', 'pen', 'pet', 'step', 'rent', 'term',
  'stone', 'train', 'react', 'cart', 'cast', 'most', 'post', 'spot', 'arts',
  'acre', 'dart', 'road', 'rod', 'tame', 'meat', 'snow', 'sent', 'nets', 'tops',
];

function gridWordPaths(): string[] {
  return [
    join(__dirname, '../data/grid-words.json'),
    join(process.cwd(), 'apps/server/data/grid-words.json'),
    join(__dirname, '../data/dictionary.fallback.json'),
    join(process.cwd(), 'apps/server/data/dictionary.fallback.json'),
  ];
}

function makeDictionary(words: string[], offensive: string[] = []): WordDictionary {
  const wordSet = new Set(words.map((w) => w.toLowerCase()));
  const offensiveSet = new Set(offensive.map((w) => w.toLowerCase()));
  return {
    has: (word: string) => wordSet.has(word.toLowerCase()),
    isOffensive: (word: string) => offensiveSet.has(word.toLowerCase()),
  };
}

let gridDictionary: WordDictionary | null = null;

/** Small local word list used only for grid generation (not player validation). */
export function getGridDictionary(): WordDictionary {
  if (gridDictionary) return gridDictionary;

  for (const p of gridWordPaths()) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8')) as {
        words: string[];
        offensive?: string[];
      };
      gridDictionary = makeDictionary(data.words, data.offensive ?? []);
      console.log(`Grid dictionary: ${data.words.length} words from ${p}`);
      return gridDictionary;
    }
  }

  gridDictionary = makeDictionary(DEV_WORDS);
  console.warn('Using built-in dev grid dictionary');
  return gridDictionary;
}
