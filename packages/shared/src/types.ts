export type Tile = {
  index: number;
  display: string;
  letterCount: number;
};

export type GameMode = 'solo' | 'multiplayer';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameStatus =
  | 'waiting'
  | 'countdown'
  | 'active'
  | 'round_ending'
  | 'results'
  | 'sudden_death_setup'
  | 'sudden_death_countdown'
  | 'sudden_death_active'
  | 'cancelled';

export type WordOutcome =
  | 'accepted'
  | 'duplicate'
  | 'invalid'
  | 'rejected_late'
  | 'rejected_tampered';

export type SubmitWordResult = {
  outcome: WordOutcome;
  word?: string;
  pointsDelta: number;
  totalScore: number;
  message: string;
};

export type ParticipantRole = 'human' | 'computer';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'removed';

export const GRID_SIZE = 5;
export const TILE_COUNT = 25;
export const MIN_WORD_LENGTH = 3;
export const COUNTDOWN_MS = 3000;
export const SUDDEN_DEATH_MS = 60000;
export const RECONNECT_MS = 10000;
export const ROOM_EXPIRY_MS = 30 * 60 * 1000;
export const RESULTS_RETENTION_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_DURATION_SECONDS = 180;
export const MIN_DURATION_SECONDS = 60;
export const MAX_DURATION_SECONDS = 180;
export const DURATION_STEP_SECONDS = 10;
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const MAX_ACTIVE_GAMES = 2;
export const MAX_SUDDEN_DEATH_ROUNDS = 2;
export const MAX_DISPLAY_NAME_LENGTH = 10;
