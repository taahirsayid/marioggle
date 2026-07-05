import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrieDictionary } from '@marioggle/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV_WORDS = [
  'cat', 'cats', 'dog', 'dogs', 'run', 'runs', 'running', 'tea', 'eat', 'ate',
  'rate', 'tar', 'art', 'rat', 'star', 'arts', 'tars', 'race', 'care', 'acre',
  'react', 'trace', 'cart', 'cast', 'cost', 'most', 'post', 'stop', 'tops', 'spot',
  'port', 'sort', 'orts', 'core', 'rote', 'toe', 'toes', 'set', 'net', 'ten',
  'nets', 'nest', 'sent', 'tens', 'stone', 'notes', 'tones', 'onset', 'steno',
  'train', 'rain', 'air', 'tin', 'nit', 'tan', 'ant', 'ants', 'stand', 'sand',
  'and', 'ads', 'sad', 'dad', 'add', 'adds', 'dart', 'trad', 'road', 'oar',
  'rod', 'rods', 'soda', 'ado', 'do', 'so', 'at', 'it', 'is', 'as', 'or',
  'quit', 'quite', 'quote', 'quits', 'quest', 'question', 'equal', 'equate',
  'line', 'lines', 'liner', 'linen', 'lion', 'loin', 'noil', 'oil', 'ion',
  'one', 'ones', 'tone', 'note', 'not', 'ton', 'nots', 'son', 'sons', 'won',
  'own', 'owns', 'now', 'snow', 'sown', 'wons', 'slow', 'lows', 'owl', 'owls',
  'word', 'words', 'sword', 'draw', 'ward', 'raw', 'war', 'wars', 'was', 'saw',
  'sea', 'ease', 'seas', 'seat', 'ates', 'east', 'eats', 'teas', 'team', 'meat',
  'mate', 'tame', 'meta', 'term', 'met', 'rem', 'rent', 'tern', 'net', 'pen',
  'pent', 'pet', 'pets', 'pest', 'step', 'pests', 'steps', 'sept', 'set', 'rest',
  'res', 'ser', 'err', 'errs', 'error', 'errors', 'rose', 'ores', 'sore', 'roe',
  'ore', 'ore', 'ore', 'ore', 'ore', 'ore', 'ore', 'ore', 'ore', 'ore',
];

let dictionary: TrieDictionary | null = null;

export function loadDictionary(): TrieDictionary {
  if (dictionary) return dictionary;

  const paths = [
    join(__dirname, '../data/dictionary.json'),
    join(__dirname, '../../data/dictionary.json'),
    join(process.cwd(), 'data/dictionary.json'),
    join(process.cwd(), 'apps/server/data/dictionary.json'),
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8')) as {
        words: string[];
        offensive?: string[];
      };
      dictionary = TrieDictionary.fromWordList(data.words, data.offensive ?? []);
      return dictionary;
    }
  }

  const offensivePath = join(process.cwd(), 'data/offensive-deny-list.txt');
  const offensive = existsSync(offensivePath)
    ? readFileSync(offensivePath, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean)
    : [];

  dictionary = TrieDictionary.fromWordList(DEV_WORDS, offensive);
  console.warn('Using built-in dev dictionary. Run npm run build:dictionary for SCOWL list.');
  return dictionary;
}

export function isDictionaryAvailable(): boolean {
  try {
    loadDictionary();
    return true;
  } catch {
    return false;
  }
}
