import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrieDictionary } from '@marioggle/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV_WORDS = [
  'cat', 'cats', 'dog', 'dogs', 'run', 'runs', 'running', 'tea', 'eat', 'rate',
  'star', 'trace', 'care', 'race', 'stone', 'notes', 'train', 'rain', 'stand',
  'sand', 'quit', 'quite', 'quote', 'quest', 'equal', 'line', 'lines', 'lion',
  'word', 'words', 'team', 'mate', 'rest', 'rose', 'ore', 'port', 'sort', 'stop',
  'net', 'ten', 'nest', 'sent', 'tone', 'note', 'one', 'son', 'own', 'now',
  'slow', 'sea', 'ease', 'east', 'seat', 'pen', 'pet', 'step', 'rent', 'term',
];

let dictionary: TrieDictionary | null = null;
let loading = false;

export function isDictionaryLoaded(): boolean {
  return dictionary !== null;
}

/** True only when dictionary is already in memory (does not trigger load). */
export function isDictionaryAvailable(): boolean {
  return isDictionaryLoaded();
}

function dictionaryPaths(): string[] {
  return [
    join(__dirname, '../../data/dictionary.json'),
    join(__dirname, '../data/dictionary.json'),
    join(process.cwd(), 'data/dictionary.json'),
    join(process.cwd(), 'apps/server/data/dictionary.json'),
  ];
}

export function loadDictionary(): TrieDictionary {
  if (dictionary) return dictionary;

  for (const p of dictionaryPaths()) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8')) as {
        words: string[];
        offensive?: string[];
        source?: string;
      };
      dictionary = TrieDictionary.fromWordList(data.words, data.offensive ?? []);
      console.log(`Dictionary loaded: ${data.words.length} words from ${p} (${data.source ?? 'file'})`);
      return dictionary;
    }
  }

  const offensivePath = join(process.cwd(), 'data/offensive-deny-list.txt');
  const offensive = existsSync(offensivePath)
    ? readFileSync(offensivePath, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean)
    : [];

  dictionary = TrieDictionary.fromWordList(DEV_WORDS, offensive);
  console.warn('Using built-in dev dictionary. Run npm run build:dictionary for WordNet list.');
  return dictionary;
}

/** Load dictionary after the HTTP server is listening (avoids Render health-check timeout). */
export function startDictionaryLoad(): void {
  if (dictionary || loading) return;
  loading = true;
  setImmediate(() => {
    try {
      loadDictionary();
    } catch (err) {
      console.error('Dictionary load failed:', err);
    } finally {
      loading = false;
    }
  });
}

export function isDictionaryLoading(): boolean {
  return loading;
}
