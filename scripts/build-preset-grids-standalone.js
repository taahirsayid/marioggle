/**
 * Self-contained preset grid builder.
 * Big Boggle dice (A2) + richness pick (B2) → presetGrids.json (D1).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GRID_WORDS = path.join(ROOT, 'apps/server/data/grid-words.json');
const OUT_PATHS = [
  path.join(ROOT, 'packages/engine/data/presetGrids.json'),
  path.join(ROOT, 'apps/server/data/presetGrids.json'),
];

const COUNT = Number(process.env.PRESET_GRID_COUNT || 100);
const K = Number(process.env.PRESET_CANDIDATES_K || 6);
const MIN_WORDS = Number(process.env.PRESET_MIN_WORDS || 28);
const RICHNESS_FLOOR = Number(process.env.PRESET_RICHNESS_FLOOR || 32);

const BIG_BOGGLE_DICE = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCENST',
  'CEIILT', 'CEILPT', 'CEIPST', 'DDHNOT', 'DHHLOR',
  'DHLNOR', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU',
  'FIPRSY', 'GORRVW', 'IPRRRY', 'NOOTUW', 'OOOTTU',
];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function faceToTile(index, face) {
  if (face === 'Q') return { index, display: 'Qu', letterCount: 2 };
  return { index, display: face, letterCount: 1 };
}

function rollBigBoggleGrid(seed) {
  const rng = mulberry32(seed);
  const diceOrder = Array.from({ length: BIG_BOGGLE_DICE.length }, (_, i) => i);
  for (let j = diceOrder.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [diceOrder[j], diceOrder[k]] = [diceOrder[k], diceOrder[j]];
  }
  return diceOrder.map((dieIndex, gridIndex) => {
    const faces = BIG_BOGGLE_DICE[dieIndex];
    const face = faces[Math.floor(rng() * faces.length)];
    return faceToTile(gridIndex, face);
  });
}

const ADJ = (() => {
  const adj = Array.from({ length: 25 }, () => []);
  for (let a = 0; a < 25; a++) {
    const r1 = Math.floor(a / 5);
    const c1 = a % 5;
    for (let b = 0; b < 25; b++) {
      if (a === b) continue;
      const r2 = Math.floor(b / 5);
      const c2 = b % 5;
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) adj[a].push(b);
    }
  }
  return adj;
})();

function buildTrie(words, offensiveList) {
  const root = {};
  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w.length < 3) continue;
    let node = root;
    for (const ch of w) {
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node.$ = true;
  }
  const offensive = new Set(offensiveList.map((w) => w.toLowerCase()));
  return {
    has(word) {
      let node = root;
      for (const ch of word.toLowerCase()) {
        if (!node[ch]) return false;
        node = node[ch];
      }
      return node.$ === true;
    },
    hasPrefix(prefix) {
      let node = root;
      for (const ch of prefix.toLowerCase()) {
        if (!node[ch]) return false;
        node = node[ch];
      }
      return true;
    },
    isOffensive(word) {
      return offensive.has(word.toLowerCase());
    },
  };
}

function wordFromPath(grid, pathIndices) {
  return pathIndices.map((i) => grid[i].display).join('').toLowerCase();
}

function letterCountFromPath(grid, pathIndices) {
  return pathIndices.reduce((sum, i) => sum + grid[i].letterCount, 0);
}

/** DFS with trie prefix pruning — fast enough for offline batch builds. */
function findAllSolutionWords(grid, trie) {
  const results = [];
  const seen = new Set();

  function dfs(pathArr, visited) {
    if (pathArr.length > 16) return;
    const word = wordFromPath(grid, pathArr);
    if (!trie.hasPrefix(word)) return;

    const letterCount = letterCountFromPath(grid, pathArr);
    if (letterCount >= 3 && trie.has(word) && !trie.isOffensive(word) && !seen.has(word)) {
      seen.add(word);
      results.push({ word, path: pathArr.slice(), letterCount });
    }

    const last = pathArr[pathArr.length - 1];
    for (const next of ADJ[last]) {
      if (visited & (1 << next)) continue;
      pathArr.push(next);
      dfs(pathArr, visited | (1 << next));
      pathArr.pop();
    }
  }

  for (let start = 0; start < 25; start++) dfs([start], 1 << start);
  return results;
}

function scoreBoardRichness(solutions) {
  let score = solutions.length;
  for (const s of solutions) {
    if (s.letterCount >= 6) score += 2;
    if (s.letterCount >= 7) score += 3;
    if (s.letterCount >= 8) score += 5;
  }
  return score;
}

function generateRichDiceBoard(seed, trie, k, floor) {
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < k; attempt++) {
    const attemptSeed = seed + attempt * 7919;
    const tiles = rollBigBoggleGrid(attemptSeed);
    const solutions = findAllSolutionWords(tiles, trie);
    const richness = scoreBoardRichness(solutions);
    if (richness > bestScore) {
      bestScore = richness;
      best = { tiles, seed: attemptSeed, solutions, richness };
    }
    if (richness >= floor) {
      return { tiles, seed: attemptSeed, solutions, richness };
    }
  }
  return best;
}

function buildOneGrid(baseSeed, trie) {
  let best = null;
  for (let retry = 0; retry < 20; retry++) {
    const board = generateRichDiceBoard(baseSeed + retry * 1337, trie, K, RICHNESS_FLOOR);
    if (board.solutions.length >= MIN_WORDS) return board;
    if (!best || board.richness > best.richness) best = board;
  }
  if (best && best.solutions.length >= 22) return best;
  throw new Error(`Failed to qualify grid for base seed ${baseSeed}`);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const data = JSON.parse(fs.readFileSync(GRID_WORDS, 'utf-8'));
  const trie = buildTrie(data.words, data.offensive || []);
  const grids = [];
  const started = Date.now();

  console.log(
    `Building ${COUNT} preset grids (k=${K}, floor=${RICHNESS_FLOOR}, minWords=${MIN_WORDS}, dict=${data.words.length})...`,
  );

  for (let i = 0; i < COUNT; i++) {
    const baseSeed = 1_000_000 + i * 100_003;
    const board = buildOneGrid(baseSeed, trie);
    grids.push({
      seed: board.seed,
      tiles: board.tiles,
      solutions: board.solutions,
      richness: board.richness,
    });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    process.stdout.write(
      `\r  ${i + 1}/${COUNT} — ${board.solutions.length} words, richness ${board.richness} (${elapsed}s)`,
    );
  }
  console.log('');

  const library = {
    version: 1,
    count: grids.length,
    generatedAt: new Date().toISOString(),
    dice: 'big-boggle-25',
    k: K,
    richnessFloor: RICHNESS_FLOOR,
    minWords: MIN_WORDS,
    grids,
  };

  const json = JSON.stringify(library);
  for (const outPath of OUT_PATHS) {
    ensureDir(outPath);
    fs.writeFileSync(outPath, json, 'utf-8');
    console.log(`Wrote ${grids.length} grids (${(json.length / 1024).toFixed(0)} KB) → ${outPath}`);
  }
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main();
