const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const cache = new Map<string, boolean>();

/** Validate a word via Free Dictionary API (https://dictionaryapi.dev). Results are cached in memory. */
export async function lookupWord(word: string): Promise<boolean> {
  const key = word.toLowerCase().trim();
  if (key.length < 3) return false;
  if (!/^[a-z]+$/.test(key)) return false;

  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000),
    });
    const valid = res.ok;
    cache.set(key, valid);
    return valid;
  } catch {
    // On network failure, do not cache — allow retry
    return false;
  }
}

export function clearDictionaryCache(): void {
  cache.clear();
}
