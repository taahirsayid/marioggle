export class TrieDictionary {
  private root: Record<string, unknown> = {};
  private offensive: Set<string>;

  constructor(words: string[], offensiveWords: string[] = []) {
    this.offensive = new Set(offensiveWords.map((w) => w.toLowerCase()));
    for (const word of words) {
      const w = word.toLowerCase();
      if (w.length < 3) continue;
      let node = this.root;
      for (const ch of w) {
        if (!node[ch]) node[ch] = {};
        node = node[ch] as Record<string, unknown>;
      }
      node['$'] = true;
    }
  }

  has(word: string): boolean {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node[ch]) return false;
      node = node[ch] as Record<string, unknown>;
    }
    return node['$'] === true;
  }

  isOffensive(word: string): boolean {
    return this.offensive.has(word.toLowerCase());
  }

  static fromWordList(words: string[], offensive: string[] = []): TrieDictionary {
    return new TrieDictionary(words, offensive);
  }
}
