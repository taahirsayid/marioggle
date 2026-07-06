import { randomUUID } from 'node:crypto';
import type { Tile } from '@marioggle/shared';
import {
  COUNTDOWN_MS,
  DEFAULT_DURATION_SECONDS,
  MAX_ACTIVE_GAMES,
  MAX_SUDDEN_DEATH_ROUNDS,
  RECONNECT_MS,
  type Difficulty,
} from '@marioggle/shared';
import type { WordDictionary } from '@marioggle/engine';
import {
  generateQualifiedGrid,
  pickPresetGrid,
  submitWord,
  submitWordAsync,
  type SolutionWord,
} from '@marioggle/engine';

export type Participant = {
  sessionId: string;
  displayName: string;
  role: 'human' | 'computer';
  difficulty?: Difficulty;
  score: number;
  foundWords: Set<string>;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected' | 'removed';
  visualId: number;
};

export type ActiveGame = {
  id: string;
  mode: 'solo' | 'multiplayer';
  status: 'countdown' | 'active' | 'results' | 'cancelled';
  grid: Tile[];
  solutions: SolutionWord[];
  seed: number;
  durationSeconds: number;
  countdownEndsAt: number | null;
  activeEndsAt: number | null;
  participants: Map<string, Participant>;
  hostSessionId: string;
  idempotency: Map<string, unknown>;
  suddenDeathRound: number;
  pausedAt: number | null;
  pauseOffsetMs: number;
  computerSchedule: ReturnType<typeof setTimeout>[];
};

type CreateSoloInput = {
  sessionId: string;
  displayName: string;
  difficulty: Difficulty;
  durationSeconds: number;
  dictionary: WordDictionary;
};

type CreateMultiplayerInput = {
  hostSessionId: string;
  durationSeconds: number;
  dictionary: WordDictionary;
  players: { sessionId: string; displayName: string; visualId: number }[];
};

export type GameBroadcast = (gameId: string, event: string, payload: unknown, sessionId?: string) => void;

const VISUAL_COLORS = [1, 2, 3, 4, 5, 6];

export class GameManager {
  private games = new Map<string, ActiveGame>();
  private roomToGame = new Map<string, string>();
  private activeCount = 0;
  private timers = new Map<string, ReturnType<typeof setTimeout>[]>();
  private broadcast: GameBroadcast = () => {};

  setBroadcast(fn: GameBroadcast) {
    this.broadcast = fn;
  }

  getGameIdForRoom(roomId: string): string | undefined {
    return this.roomToGame.get(roomId);
  }

  getActiveGameCount(): number {
    return this.activeCount;
  }

  canStartGame(): boolean {
    return this.activeCount < MAX_ACTIVE_GAMES;
  }

  createSoloGame(input: CreateSoloInput): ActiveGame {
    if (!this.canStartGame()) {
      throw new Error('CAPACITY_FULL');
    }

    const seed = Math.floor(Math.random() * 1_000_000_000);
    const { tiles, solutions, seed: gridSeed } = generateQualifiedGrid(seed, input.dictionary);
    return this.buildSoloGame(input, { tiles, solutions, gridSeed });
  }

  async createSoloGameAsync(input: CreateSoloInput): Promise<ActiveGame> {
    if (!this.canStartGame()) {
      throw new Error('CAPACITY_FULL');
    }

    const seed = Math.floor(Math.random() * 1_000_000_000);
    const preset = pickPresetGrid(seed);
    return this.buildSoloGame(input, {
      tiles: preset.tiles,
      solutions: preset.solutions,
      gridSeed: preset.seed,
    });
  }

  private buildSoloGame(
    input: CreateSoloInput,
    grid: { tiles: Tile[]; solutions: SolutionWord[]; gridSeed: number },
  ): ActiveGame {
    if (!this.canStartGame()) {
      throw new Error('CAPACITY_FULL');
    }

    const gameId = randomUUID();
    const now = Date.now();

    const human: Participant = {
      sessionId: input.sessionId,
      displayName: input.displayName,
      role: 'human',
      score: 0,
      foundWords: new Set(),
      connectionStatus: 'connected',
      visualId: VISUAL_COLORS[0],
    };

    const computer: Participant = {
      sessionId: `computer-${gameId}`,
      displayName: 'Computer',
      role: 'computer',
      difficulty: input.difficulty,
      score: 0,
      foundWords: new Set(),
      connectionStatus: 'connected',
      visualId: VISUAL_COLORS[1],
    };

    const game: ActiveGame = {
      id: gameId,
      mode: 'solo',
      status: 'countdown',
      grid: grid.tiles,
      solutions: grid.solutions,
      seed: grid.gridSeed,
      durationSeconds: input.durationSeconds || DEFAULT_DURATION_SECONDS,
      countdownEndsAt: now + COUNTDOWN_MS,
      activeEndsAt: null,
      participants: new Map([
        [human.sessionId, human],
        [computer.sessionId, computer],
      ]),
      hostSessionId: input.sessionId,
      idempotency: new Map(),
      suddenDeathRound: 0,
      pausedAt: null,
      pauseOffsetMs: 0,
      computerSchedule: [],
    };

    this.games.set(gameId, game);
    this.activeCount++;
    this.scheduleCountdown(gameId);
    this.scheduleComputerWords(game, input.dictionary);
    return game;
  }

  async createMultiplayerGameAsync(roomId: string, input: CreateMultiplayerInput): Promise<ActiveGame> {
    if (!this.canStartGame()) {
      throw new Error('CAPACITY_FULL');
    }

    const seed = Math.floor(Math.random() * 1_000_000_000);
    const preset = pickPresetGrid(seed);
    return this.buildMultiplayerGame(roomId, input, {
      tiles: preset.tiles,
      solutions: preset.solutions,
      gridSeed: preset.seed,
    });
  }

  createMultiplayerGame(roomId: string, input: CreateMultiplayerInput): ActiveGame {
    if (!this.canStartGame()) {
      throw new Error('CAPACITY_FULL');
    }

    const seed = Math.floor(Math.random() * 1_000_000_000);
    const { tiles, solutions, seed: gridSeed } = generateQualifiedGrid(seed, input.dictionary);
    return this.buildMultiplayerGame(roomId, input, { tiles, solutions, gridSeed });
  }

  private buildMultiplayerGame(
    roomId: string,
    input: CreateMultiplayerInput,
    grid: { tiles: Tile[]; solutions: SolutionWord[]; gridSeed: number },
  ): ActiveGame {
    const gameId = randomUUID();
    const now = Date.now();

    const participants = new Map<string, Participant>();
    for (const p of input.players) {
      participants.set(p.sessionId, {
        sessionId: p.sessionId,
        displayName: p.displayName,
        role: 'human',
        score: 0,
        foundWords: new Set(),
        connectionStatus: 'connected',
        visualId: p.visualId,
      });
    }

    const game: ActiveGame = {
      id: gameId,
      mode: 'multiplayer',
      status: 'countdown',
      grid: grid.tiles,
      solutions: grid.solutions,
      seed: grid.gridSeed,
      durationSeconds: input.durationSeconds || DEFAULT_DURATION_SECONDS,
      countdownEndsAt: now + COUNTDOWN_MS,
      activeEndsAt: null,
      participants,
      hostSessionId: input.hostSessionId,
      idempotency: new Map(),
      suddenDeathRound: 0,
      pausedAt: null,
      pauseOffsetMs: 0,
      computerSchedule: [],
    };

    this.games.set(gameId, game);
    this.roomToGame.set(roomId, gameId);
    this.activeCount++;
    this.scheduleCountdown(gameId);
    this.emitGameState(gameId);
    return game;
  }

  getGame(gameId: string): ActiveGame | undefined {
    return this.games.get(gameId);
  }

  private scheduleCountdown(gameId: string) {
    const t = setTimeout(() => this.startActiveRound(gameId), COUNTDOWN_MS);
    this.addTimer(gameId, t);
  }

  private startActiveRound(gameId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'countdown') return;
    game.status = 'active';
    game.activeEndsAt = Date.now() + game.durationSeconds * 1000;
    game.countdownEndsAt = null;

    this.broadcast(gameId, 'round_started', {
      activeEndsAt: game.activeEndsAt,
      serverNow: Date.now(),
      grid: game.grid,
    });

    const t = setTimeout(() => this.endRound(gameId), game.durationSeconds * 1000);
    this.addTimer(gameId, t);
    this.emitGameState(gameId);
  }

  private endRound(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    game.status = 'results';
    game.activeEndsAt = Date.now();
    this.clearComputerSchedule(game);
    this.activeCount = Math.max(0, this.activeCount - 1);

    const rankings = [...game.participants.values()]
      .filter((p) => p.role === 'human')
      .map((p) => ({
        sessionId: p.sessionId,
        displayName: p.displayName,
        score: p.score,
        wordCount: p.foundWords.size,
        words: [...p.foundWords],
      }))
      .sort((a, b) => b.score - a.score);

    this.broadcast(gameId, 'round_ended', { rankings });
    this.broadcast(gameId, 'results_ready', { gameId });
  }

  emitGameState(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    for (const [sessionId] of game.participants) {
      if (game.participants.get(sessionId)?.role === 'human') {
        this.broadcast(gameId, 'game_state', this.toClientState(game, sessionId), sessionId);
      }
    }
  }

  private addTimer(gameId: string, t: ReturnType<typeof setTimeout>) {
    const list = this.timers.get(gameId) ?? [];
    list.push(t);
    this.timers.set(gameId, list);
  }

  private scheduleComputerWords(game: ActiveGame, dictionary: WordDictionary) {
    const computer = [...game.participants.values()].find((p) => p.role === 'computer');
    if (!computer || !computer.difficulty) return;

    const profile = {
      easy: { ratio: 0.3, delay: 8000 },
      medium: { ratio: 0.5, delay: 6000 },
      hard: { ratio: 0.7, delay: 4000 },
    }[computer.difficulty];

    const eligible = game.solutions.filter((s) => {
      if (computer.difficulty === 'easy') return s.letterCount <= 4;
      if (computer.difficulty === 'hard') return s.letterCount >= 5;
      return true;
    });

    const count = Math.floor(eligible.length * profile.ratio);
    const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, count);

    shuffled.forEach((sol, i) => {
      const delay = COUNTDOWN_MS + profile.delay * (i + 1) + Math.random() * 2000;
      const t = setTimeout(() => {
        if (game.status !== 'active') return;
        if (computer.foundWords.has(sol.word)) return;
        computer.foundWords.add(sol.word);
        const result = submitWord({
          grid: game.grid,
          path: sol.path,
          foundWords: computer.foundWords,
          currentScore: computer.score,
          dictionary,
          activeEndsAt: game.activeEndsAt ?? Date.now(),
          receivedAt: Date.now(),
        });
        if (result.outcome === 'accepted') {
          computer.score = result.totalScore;
        }
      }, delay);
      game.computerSchedule.push(t);
    });
  }

  private clearComputerSchedule(game: ActiveGame) {
    for (const t of game.computerSchedule) clearTimeout(t);
    game.computerSchedule = [];
  }

  handleSubmit(
    gameId: string,
    sessionId: string,
    path: number[],
    idempotencyKey: string,
    dictionary: WordDictionary,
  ) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('NOT_FOUND');
    if (game.status !== 'active') throw new Error('INVALID_STATE');

    if (game.idempotency.has(idempotencyKey)) {
      return game.idempotency.get(idempotencyKey);
    }

    const participant = game.participants.get(sessionId);
    if (!participant || participant.role !== 'human') throw new Error('INVALID_STATE');
    if (participant.connectionStatus === 'removed') throw new Error('INVALID_STATE');

    const result = submitWord({
      grid: game.grid,
      path,
      foundWords: participant.foundWords,
      currentScore: participant.score,
      dictionary,
      activeEndsAt: game.activeEndsAt ?? 0,
      receivedAt: Date.now(),
    });

    if (result.outcome === 'accepted') {
      participant.foundWords.add(result.word!);
    }
    participant.score = result.totalScore;
    game.idempotency.set(idempotencyKey, result);

    this.broadcast(gameId, 'word_result', {
      sessionId,
      ...result,
    });
    this.emitGameState(gameId);

    return result;
  }

  async handleSubmitAsync(
    gameId: string,
    sessionId: string,
    path: number[],
    idempotencyKey: string,
    gridDictionary: WordDictionary,
    lookupWord: (word: string) => Promise<boolean>,
  ) {
    const game = this.games.get(gameId);
    if (!game) throw new Error('NOT_FOUND');
    if (game.status !== 'active') throw new Error('INVALID_STATE');

    if (game.idempotency.has(idempotencyKey)) {
      return game.idempotency.get(idempotencyKey);
    }

    const participant = game.participants.get(sessionId);
    if (!participant || participant.role !== 'human') throw new Error('INVALID_STATE');
    if (participant.connectionStatus === 'removed') throw new Error('INVALID_STATE');

    const result = await submitWordAsync({
      grid: game.grid,
      path,
      foundWords: participant.foundWords,
      currentScore: participant.score,
      dictionary: gridDictionary,
      activeEndsAt: game.activeEndsAt ?? 0,
      receivedAt: Date.now(),
      lookupWord,
    });

    if (result.outcome === 'accepted') {
      participant.foundWords.add(result.word!);
    }
    participant.score = result.totalScore;
    game.idempotency.set(idempotencyKey, result);

    this.broadcast(gameId, 'word_result', {
      sessionId,
      ...result,
    });
    this.emitGameState(gameId);

    return result;
  }

  toClientState(game: ActiveGame, sessionId: string) {
    const human = game.participants.get(sessionId);
    const now = Date.now();
    const showGrid = game.status !== 'countdown';
    const players =
      game.mode === 'multiplayer'
        ? [...game.participants.values()]
            .filter((p) => p.role === 'human')
            .map((p) => ({
              sessionId: p.sessionId,
              displayName: p.displayName,
              score: p.score,
              visualId: p.visualId,
            }))
            .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
        : undefined;
    return {
      gameId: game.id,
      mode: game.mode,
      status: game.status,
      grid: showGrid ? game.grid : [],
      score: human?.score ?? 0,
      players,
      activeEndsAt: game.activeEndsAt,
      countdownEndsAt: game.countdownEndsAt,
      serverNow: now,
      durationSeconds: game.durationSeconds,
      hostSessionId: game.hostSessionId,
    };
  }

  getResults(gameId: string) {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'results') return null;
    return [...game.participants.values()]
      .filter((p) => p.role === 'human')
      .map((p) => ({
        sessionId: p.sessionId,
        displayName: p.displayName,
        score: p.score,
        wordCount: p.foundWords.size,
        words: [...p.foundWords].sort(),
      }))
      .sort((a, b) => b.score - a.score);
  }
}

export const gameManager = new GameManager();

export { MAX_SUDDEN_DEATH_ROUNDS, RECONNECT_MS };
