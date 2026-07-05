export { lookupWord, clearDictionaryCache } from './dictionaryApi.js';
export { getGridDictionary } from './gridDictionary.js';

/** Word validation uses dictionaryapi.dev — always available (no startup load). */
export function isDictionaryLoaded(): boolean {
  return true;
}

export function isDictionaryLoading(): boolean {
  return false;
}

/** @deprecated Use getGridDictionary() for grids; lookupWord() for player submissions. */
export { getGridDictionary as loadDictionary } from './gridDictionary.js';

export function startDictionaryLoad(): void {
  // No-op: dictionary API requires no startup loading
}
