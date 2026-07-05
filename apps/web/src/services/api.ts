const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? err.code ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  ensureSession: () => request<{ sessionId: string }>('/api/session', { method: 'POST' }),
  setDisplayName: (displayName: string) =>
    request<{ ok: boolean }>('/api/session/display-name', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    }),
  getSocketToken: () => request<{ token: string }>('/api/session/socket-token', { method: 'POST' }),
  startSoloGame: (body: { displayName: string; difficulty: string; durationSeconds: number }) =>
    request<{ gameId: string }>('/api/solo/games', { method: 'POST', body: JSON.stringify(body) }),
  getGameState: (gameId: string) => request<GameStateResponse>(`/api/games/${gameId}`),
  submitWord: (gameId: string, path: number[], idempotencyKey: string) =>
    request<WordResultResponse>(`/api/games/${gameId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ path, idempotencyKey }),
    }),
  createRoom: (body: { displayName: string; maxPlayers: number; durationSeconds: number }) =>
    request<RoomResponse>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (body: { displayName: string; code?: string; inviteToken?: string }) =>
    request<RoomResponse>('/api/rooms/join', { method: 'POST', body: JSON.stringify(body) }),
  getMaintenance: () => request<{ maintenance: boolean }>('/api/maintenance'),
};

export type TileDto = { index: number; display: string; letterCount: number };

export type GameStateResponse = {
  gameId: string;
  status: string;
  grid: TileDto[];
  score: number;
  activeEndsAt: number | null;
  countdownEndsAt: number | null;
  serverNow: number;
  durationSeconds: number;
  difficulty?: string;
};

export type WordResultResponse = {
  outcome: string;
  word?: string;
  pointsDelta: number;
  totalScore: number;
  message: string;
};

export type RoomResponse = {
  roomId: string;
  code: string;
  inviteUrl: string;
  maxPlayers: number;
  durationSeconds: number;
  hostSessionId: string;
  players: { sessionId: string; displayName: string; visualId: number; isHost: boolean }[];
};
