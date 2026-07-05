#!/usr/bin/env tsx
/**
 * Builds dictionary.json from SCOWL word lists.
 * SCOWL: http://wordlist.aspell.net/ (free, attribution required)
 *
 * Downloads size-60 lists for en and en-GB, merges, filters hyphenated entries.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { get } from 'node:https';

const SCOWL_BASE = 'https://raw.githubusercontent.com/en-wl/wordlist/master/scowl-6.0.1';
const FILES = ['english-words.60', 'english-words.60-70', 'english-words.70'];
const OUT_DIR = join(process.cwd(), 'data');
const OUT_FILE = join(OUT_DIR, 'dictionary.json');

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return downloadFile(loc, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function loadOffensive(): string[] {
  const p = join(OUT_DIR, 'offensive-deny-list.txt');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8')
   .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

function isValidWord(w: string): boolean {
  if (w.length < 3) return false;
  if (w.includes('-')) return false;
  if (w.includes("'")) return false;
  if (!/^[a-z]+$/.test(w)) return false;
  return true;
}

async function fetchScowlWords(): Promise<Set<string>> {
  mkdirSync(join(OUT_DIR, 'scowl'), { recursive: true });
  const words = new Set<string>();

  for (const file of FILES) {
    const url = `${SCOWL_BASE}/${file}`;
    const localPath = join(OUT_DIR, 'scowl', file);
    try {
      console.log(`Fetching ${url}...`);
      await downloadFile(url, localPath);
      const content = readFileSync(localPath, 'utf-8');
      for (const line of content.split('\n')) {
        const w = line.trim().toLowerCase();
        if (isValidWord(w)) words.add(w);
      }
    } catch (err) {
      console.warn(`Could not fetch ${file}:`, err);
    }
  }

  return words;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const offensive = loadOffensive();
  let words: Set<string>;

  try {
    words = await fetchScowlWords();
    if (words.size < 1000) throw new Error('SCOWL fetch returned too few words');
    console.log(`Loaded ${words.size} words from SCOWL`);
  } catch (err) {
    console.warn('SCOWL fetch failed, using fallback word list:', err);
    words = new Set([
      'cat', 'cats', 'dog', 'run', 'runs', 'running', 'tea', 'eat', 'rate', 'star',
      'trace', 'care', 'race', 'stone', 'notes', 'train', 'rain', 'stand', 'sand',
      'quit', 'quite', 'quote', 'quest', 'equal', 'line', 'lines', 'lion', 'word',
      'words', 'team', 'mate', 'rest', 'rose', 'ore', 'ore', 'port', 'sort', 'stop',
    ]);
  }

  const wordList = [...words].sort();
  writeFileSync(OUT_FILE, JSON.stringify({ words: wordList, offensive }, null, 0));
  mkdirSync(join(process.cwd(), 'apps/server/data'), { recursive: true });
  writeFileSync(join(process.cwd(), 'apps/server/data/dictionary.json'), JSON.stringify({ words: wordList, offensive }, null, 0));
  console.log(`Wrote ${wordList.length} words to ${OUT_FILE}`);
}

main().catch(console.error);
