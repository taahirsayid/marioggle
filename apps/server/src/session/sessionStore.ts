import { randomUUID } from 'node:crypto';

export type SessionRecord = {
  displayName?: string;
  createdAt: number;
};

const sessions = new Map<string, SessionRecord>();

export function resolveSessionId(
  headerSessionId: string | undefined,
  cookieSessionId: string | undefined,
): string {
  const candidate = headerSessionId ?? cookieSessionId;
  if (candidate) {
    if (!sessions.has(candidate)) {
      sessions.set(candidate, { createdAt: Date.now() });
    }
    return candidate;
  }
  const sessionId = randomUUID();
  sessions.set(sessionId, { createdAt: Date.now() });
  return sessionId;
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, patch: Partial<SessionRecord>): void {
  const existing = sessions.get(sessionId) ?? { createdAt: Date.now() };
  sessions.set(sessionId, { ...existing, ...patch });
}

export function getSessionsStore(): Map<string, SessionRecord> {
  return sessions;
}
