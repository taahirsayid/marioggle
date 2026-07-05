const API_BASE = import.meta.env.VITE_API_URL ?? '';
const SESSION_KEY = 'marioggle_session';

export function getApiBase(): string {
  return API_BASE;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({ message: res.statusText }));
  const msg = err.message ?? err.code ?? 'Request failed';
  if (msg === 'DICTIONARY_LOADING' || err.code === 'DICTIONARY_LOADING') {
    return 'Server is still loading the word list. Please wait a few seconds and try again.';
  }
  return msg;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const sessionId = getSessionId();
  const method = (options?.method ?? 'GET').toUpperCase();
  const sendsJson = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const body = sendsJson && !options?.body ? '{}' : options?.body;

  const headers: Record<string, string> = {
    ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    body,
    headers,
  });

  const newSession = res.headers.get('X-Session-Id');
  if (newSession) setSessionId(newSession);

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

/** Wake Render free-tier instance (may take ~30s after spin-down). */
export async function wakeServer(maxAttempts = 12): Promise<boolean> {
  if (!API_BASE) {
    console.warn('VITE_API_URL is not set — API calls will fail on GitHub Pages');
    return false;
  }
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        headers: getSessionId() ? { 'X-Session-Id': getSessionId()! } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as { dictionary?: boolean; dictionaryLoading?: boolean };
        if (data.dictionary) return true;
        if (!data.dictionaryLoading && !data.dictionary) {
          // Server up but dictionary failed — still allow session/room flows to surface errors
          return true;
        }
      }
    } catch {
      // server waking or spinning up
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

export const api = {
  ensureSession: async () => {
    const data = await request<{ sessionId: string }>('/api/session', {
      method: 'POST',
      body: '{}',
    });
    setSessionId(data.sessionId);
    return data;
  },
  getSocketToken: () =>
    request<{ token: string }>('/api/session/socket-token', { method: 'POST', body: '{}' }),
  startSoloGame: (body: { displayName: string; difficulty: string; durationSeconds: number }) =>
    request<{ gameId: string }>('/api/solo/games', { method: 'POST', body: JSON.stringify(body) }),
  getGameState: (gameId: string) => request<GameStateResponse>(`/api/games/${gameId}`),
  getResults: (gameId: string) => request<{ rankings: ResultRow[] }>(`/api/games/${gameId}/results`),
  submitWord: (gameId: string, path: number[], idempotencyKey: string) =>
    request<WordResultResponse>(`/api/games/${gameId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ path, idempotencyKey }),
    }),
  createRoom: (body: { displayName: string; maxPlayers: number; durationSeconds: number }) =>
    request<RoomResponse>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (body: { displayName: string; code?: string; inviteToken?: string }) =>
    request<RoomResponse>('/api/rooms/join', { method: 'POST', body: JSON.stringify(body) }),
  getRoom: (roomId: string) => request<RoomResponse>(`/api/rooms/${roomId}`),
  getMaintenance: () => request<{ maintenance: boolean }>('/api/maintenance'),
};

export type TileDto = { index: number; display: string; letterCount: number };

export type GameStateResponse = {
  gameId: string;
  mode?: string;
  status: string;
  grid: TileDto[];
  score: number;
  activeEndsAt: number | null;
  countdownEndsAt: number | null;
  serverNow: number;
  durationSeconds: number;
  hostSessionId?: string;
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
  gameStarted: boolean;
  gameId: string | null;
  players: { sessionId: string; displayName: string; visualId: number; isHost: boolean }[];
};

export type ResultRow = {
  sessionId: string;
  displayName: string;
  score: number;
  wordCount: number;
  words: string[];
};
