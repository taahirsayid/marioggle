/** Fast O(1) word lookup — used at runtime instead of Trie (WordNet has 100k+ lemmas). */
export type WordDictionary = {
  has: (word: string) => boolean;
  isOffensive: (word: string) => boolean;
};

export class SetDictionary implements WordDictionary {
  private words: Set<string>;
  private offensive: Set<string>;

  constructor(words: string[], offensiveWords: string[] = []) {
    this.words = new Set(words.map((w) => w.toLowerCase()));
    this.offensive = new Set(offensiveWords.map((w) => w.toLowerCase()));
  }

  has(word: string): boolean {
    return this.words.has(word.toLowerCase());
  }

  isOffensive(word: string): boolean {
    return this.offensive.has(word.toLowerCase());
  }

  static fromWordList(words: string[], offensive: string[] = []): SetDictionary {
    return new SetDictionary(words, offensive);
  }

  get size(): number {
    return this.words.size;
  }
}
