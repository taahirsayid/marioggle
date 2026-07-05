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
  'about', 'above', 'after', 'again', 'alone', 'along', 'apple', 'beach', 'begin',
  'black', 'block', 'blood', 'board', 'brain', 'bread', 'break', 'bring', 'build',
  'chair', 'chart', 'check', 'child', 'class', 'clean', 'clear', 'clock', 'close',
  'count', 'court', 'cover', 'cross', 'dream', 'dress', 'earth', 'eight', 'enter',
  'field', 'fight', 'final', 'first', 'floor', 'force', 'found', 'frame', 'front',
  'fruit', 'glass', 'grade', 'grand', 'grant', 'grass', 'great', 'green', 'group',
  'heart', 'horse', 'house', 'human', 'issue', 'large', 'learn', 'leave', 'level',
  'light', 'limit', 'local', 'lower', 'major', 'match', 'maybe', 'metal', 'model',
  'money', 'month', 'motor', 'mount', 'mouse', 'mouth', 'music', 'night', 'north',
  'offer', 'order', 'other', 'paper', 'party', 'peace', 'phone', 'place', 'plane',
  'plant', 'plate', 'point', 'pound', 'power', 'press', 'price', 'print', 'proof',
  'queen', 'quick', 'quiet', 'radio', 'raise', 'reach', 'ready', 'right', 'river',
  'round', 'scale', 'scene', 'score', 'sense', 'seven', 'shape', 'share', 'sharp',
  'sheet', 'shell', 'shift', 'shirt', 'short', 'sight', 'since', 'skill', 'sleep',
  'small', 'smart', 'smile', 'solid', 'solve', 'sound', 'south', 'space', 'speak',
  'speed', 'spend', 'sport', 'staff', 'stage', 'stand', 'start', 'state', 'steam',
  'steel', 'stick', 'still', 'stock', 'stone', 'store', 'storm', 'story', 'strip',
  'study', 'stuff', 'style', 'sugar', 'table', 'taken', 'teach', 'thank', 'their',
  'theme', 'there', 'these', 'thick', 'thing', 'think', 'third', 'those', 'three',
  'throw', 'tight', 'times', 'title', 'today', 'topic', 'total', 'touch', 'tough',
  'tower', 'track', 'trade', 'train', 'treat', 'trend', 'trial', 'trust', 'truth',
  'under', 'union', 'unity', 'until', 'upper', 'urban', 'usage', 'usual', 'valid',
  'value', 'video', 'visit', 'vital', 'voice', 'waste', 'watch', 'water', 'wheel',
  'where', 'which', 'while', 'white', 'whole', 'woman', 'world', 'worry', 'worse',
  'worth', 'would', 'write', 'wrong', 'wrote', 'young', 'youth',
];

function gridWordPaths(): string[] {
  const cwd = process.cwd();
  return [
    // Compiled output with copied data (apps/server/dist/data)
    join(__dirname, '../data/grid-words.json'),
    join(__dirname, '../data/dictionary.fallback.json'),
    // Source data when running from apps/server
    join(__dirname, '../../data/grid-words.json'),
    join(__dirname, '../../data/dictionary.fallback.json'),
    join(cwd, 'data/grid-words.json'),
    join(cwd, 'data/dictionary.fallback.json'),
    // Monorepo root start command
    join(cwd, 'apps/server/data/grid-words.json'),
    join(cwd, 'apps/server/data/dictionary.fallback.json'),
    join(cwd, 'apps/server/dist/data/grid-words.json'),
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
  console.warn(`Using built-in grid dictionary (${DEV_WORDS.length} words) — grid-words.json not found`);
  return gridDictionary;
}
