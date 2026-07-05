import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WordDictionary } from '@marioggle/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeDictionary(words: string[], offensive: string[] = []): WordDictionary {
  const wordSet = new Set(words.map((w) => w.toLowerCase()));
  const offensiveSet = new Set(offensive.map((w) => w.toLowerCase()));
  return {
    has: (word: string) => wordSet.has(word.toLowerCase()),
    isOffensive: (word: string) => offensiveSet.has(word.toLowerCase()),
  };
}

const DEV_WORDS = [
  'cat', 'cats', 'dog', 'dogs', 'run', 'runs', 'running', 'tea', 'eat', 'rate',
  'star', 'trace', 'care', 'race', 'stone', 'notes', 'train', 'rain', 'stand',
  'sand', 'quit', 'quite', 'quote', 'quest', 'equal', 'line', 'lines', 'lion',
  'word', 'words', 'team', 'mate', 'rest', 'rose', 'ore', 'port', 'sort', 'stop',
  'net', 'ten', 'nest', 'sent', 'tone', 'note', 'one', 'son', 'own', 'now',
  'slow', 'sea', 'ease', 'east', 'seat', 'pen', 'pet', 'step', 'rent', 'term',
];

let dictionary: WordDictionary | null = null;
let loading = false;
let fullDictionaryLoaded = false;

export function isDictionaryLoaded(): boolean {
  return dictionary !== null;
}

export function isDictionaryAvailable(): boolean {
  return isDictionaryLoaded();
}

function fallbackPaths(): string[] {
  return [
    join(__dirname, '../data/dictionary.fallback.json'),
    join(process.cwd(), 'apps/server/data/dictionary.fallback.json'),
  ];
}

function fullDictionaryPaths(): string[] {
  return [
    join(__dirname, '../../data/dictionary.json'),
    join(__dirname, '../data/dictionary.json'),
    join(process.cwd(), 'data/dictionary.json'),
    join(process.cwd(), 'apps/server/data/dictionary.json'),
  ];
}

function loadOffensiveList(): string[] {
  const offensivePath = join(process.cwd(), 'data/offensive-deny-list.txt');
  if (!existsSync(offensivePath)) return [];
  return readFileSync(offensivePath, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function loadFallbackSync(): WordDictionary {
  for (const p of fallbackPaths()) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8')) as {
        words: string[];
        offensive?: string[];
        source?: string;
      };
      console.log(`Fallback dictionary: ${data.words.length} words from ${p}`);
      return makeDictionary(data.words, data.offensive ?? []);
    }
  }

  console.warn('Using built-in dev dictionary. Run npm run build:dictionary for WordNet list.');
  return makeDictionary(DEV_WORDS, loadOffensiveList());
}

async function loadFullDictionaryAsync(): Promise<void> {
  const { readFile } = await import('node:fs/promises');

  for (const p of fullDictionaryPaths()) {
    if (!existsSync(p)) continue;

    try {
      const text = await readFile(p, 'utf-8');
      const data = JSON.parse(text) as {
        words: string[];
        offensive?: string[];
        source?: string;
      };

      if (data.words.length < 1000) continue;

      const wordSet = new Set<string>();
      const CHUNK = 10000;
      for (let i = 0; i < data.words.length; i += CHUNK) {
        const end = Math.min(i + CHUNK, data.words.length);
        for (let j = i; j < end; j++) {
          wordSet.add(data.words[j]!.toLowerCase());
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      dictionary = makeDictionary([...wordSet], data.offensive ?? []);
      fullDictionaryLoaded = true;
      console.log(`Full dictionary loaded: ${data.words.length} words from ${p} (${data.source ?? 'file'})`);
      return;
    } catch (err) {
      console.error(`Failed to load dictionary from ${p}:`, err);
    }
  }
}

export function loadDictionary(): WordDictionary {
  if (dictionary) return dictionary;
  dictionary = loadFallbackSync();
  return dictionary;
}

/** Load fallback immediately, then WordNet list in the background without blocking health checks. */
export function startDictionaryLoad(): void {
  if (loading) return;
  loading = true;

  setImmediate(() => {
    if (!dictionary) {
      dictionary = loadFallbackSync();
    }

    void loadFullDictionaryAsync()
      .catch((err) => console.error('Full dictionary load failed:', err))
      .finally(() => {
        loading = false;
      });
  });
}

export function isDictionaryLoading(): boolean {
  return loading && !fullDictionaryLoaded;
}
