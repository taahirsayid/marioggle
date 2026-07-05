import { randomUUID } from 'node:crypto';
import { randomInt } from 'node:crypto';
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_EXPIRY_MS,
} from '@marioggle/shared';

export type RoomPlayer = {
  sessionId: string;
  displayName: string;
  visualId: number;
  isHost: boolean;
  status: 'connected' | 'removed';
};

export type Room = {
  id: string;
  code: string;
  inviteToken: string;
  hostSessionId: string;
  maxPlayers: number;
  durationSeconds: number;
  players: Map<string, RoomPlayer>;
  lastActivityAt: number;
  expiresAt: number;
  gameStarted: boolean;
};

const offensiveTerms = new Set(['badword']);

function normalizeName(name: string): string {
  return name.trim().normalize('NFKC');
}

export function validateDisplayName(name: string): string | null {
  const n = normalizeName(name);
  if (!n || n.length > MAX_DISPLAY_NAME_LENGTH) return 'INVALID_DISPLAY_NAME';
  if (offensiveTerms.has(n.toLowerCase())) return 'INVALID_DISPLAY_NAME';
  return null;
}

function generateCode(existing: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const code = String(randomInt(100000, 999999));
    if (!existing.has(code)) return code;
  }
  throw new Error('CODE_GENERATION_FAILED');
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private codeIndex = new Map<string, string>();
  private tokenIndex = new Map<string, string>();
  private rateLimits = new Map<string, { fails: number; blockedUntil: number }>();

  createRoom(input: {
    sessionId: string;
    displayName: string;
    maxPlayers: number;
    durationSeconds: number;
  }): Room {
    const nameErr = validateDisplayName(input.displayName);
    if (nameErr) throw new Error(nameErr);

    const code = generateCode(new Set(this.codeIndex.keys()));
    const inviteToken = randomUUID().replace(/-/g, '').slice(0, 16);
    const id = randomUUID();
    const now = Date.now();

    const room: Room = {
      id,
      code,
      inviteToken,
      hostSessionId: input.sessionId,
      maxPlayers: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, input.maxPlayers)),
      durationSeconds: input.durationSeconds || DEFAULT_DURATION_SECONDS,
      players: new Map(),
      lastActivityAt: now,
      expiresAt: now + ROOM_EXPIRY_MS,
      gameStarted: false,
    };

    room.players.set(input.sessionId, {
      sessionId: input.sessionId,
      displayName: normalizeName(input.displayName),
      visualId: 1,
      isHost: true,
      status: 'connected',
    });

    this.rooms.set(id, room);
    this.codeIndex.set(code, id);
    this.tokenIndex.set(inviteToken, id);
    return room;
  }

  joinRoom(input: {
    sessionId: string;
    displayName: string;
    code?: string;
    inviteToken?: string;
  }): Room {
    const rateKey = input.sessionId;
    const rl = this.rateLimits.get(rateKey);
    if (rl && rl.blockedUntil > Date.now()) throw new Error('RATE_LIMITED');

    let roomId: string | undefined;
    if (input.code) {
      roomId = this.codeIndex.get(input.code);
      if (!roomId) {
        this.recordFail(rateKey);
        throw new Error('ROOM_NOT_FOUND');
      }
    } else if (input.inviteToken) {
      roomId = this.tokenIndex.get(input.inviteToken);
      if (!roomId) throw new Error('ROOM_NOT_FOUND');
    } else {
      throw new Error('ROOM_NOT_FOUND');
    }

    const room = this.rooms.get(roomId!);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.expiresAt < Date.now()) throw new Error('ROOM_EXPIRED');
    if (room.gameStarted) throw new Error('GAME_ALREADY_STARTED');

    const nameErr = validateDisplayName(input.displayName);
    if (nameErr) throw new Error(nameErr);

    const normalized = normalizeName(input.displayName);
    for (const p of room.players.values()) {
      if (p.displayName.toLowerCase() === normalized.toLowerCase() && p.sessionId !== input.sessionId) {
        throw new Error('DUPLICATE_NAME');
      }
    }

    if (!room.players.has(input.sessionId) && room.players.size >= room.maxPlayers) {
      throw new Error('ROOM_FULL');
    }

    const visualId = room.players.has(input.sessionId)
      ? room.players.get(input.sessionId)!.visualId
      : room.players.size + 1;

    room.players.set(input.sessionId, {
      sessionId: input.sessionId,
      displayName: normalized,
      visualId,
      isHost: input.sessionId === room.hostSessionId,
      status: 'connected',
    });

    room.lastActivityAt = Date.now();
    room.expiresAt = room.lastActivityAt + ROOM_EXPIRY_MS;
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  toResponse(room: Room, baseUrl: string) {
    return {
      roomId: room.id,
      code: room.code,
      inviteUrl: `${baseUrl}/join/${room.inviteToken}`,
      maxPlayers: room.maxPlayers,
      durationSeconds: room.durationSeconds,
      hostSessionId: room.hostSessionId,
      players: [...room.players.values()].map((p) => ({
        sessionId: p.sessionId,
        displayName: p.displayName,
        visualId: p.visualId,
        isHost: p.isHost,
      })),
    };
  }

  private recordFail(key: string) {
    const rl = this.rateLimits.get(key) ?? { fails: 0, blockedUntil: 0 };
    rl.fails++;
    if (rl.fails >= 5) {
      rl.blockedUntil = Date.now() + 60_000;
      rl.fails = 0;
    }
    this.rateLimits.set(key, rl);
  }
}

export const roomManager = new RoomManager();
