import type { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { getGameManager } from './lazyServices.js';
import { roomManager } from './room/roomManager.js';
import { getGridDictionary } from './dictionary/gridDictionary.js';
import { lookupWord } from './dictionary/dictionaryApi.js';
import { resolveSessionId, updateSession } from './session/sessionStore.js';

const SESSION_COOKIE = 'marioggle_session';
const SESSION_HEADER = 'x-session-id';
const MAINTENANCE = process.env.MAINTENANCE_MODE === 'true';

function getPublicUrl(): string {
  return process.env.PUBLIC_URL ?? 'https://taahirsayid.github.io/marioggle';
}

function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? process.env.PUBLIC_URL ?? '';
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Plugins and parsers — must run before listen(). */
export async function configureApp(app: FastifyInstance) {
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const text = (body as string)?.trim() ?? '';
      done(null, text.length > 0 ? JSON.parse(text) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(cors, {
    origin: getCorsOrigins(),
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Session-Id'],
  });
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-secret-change-in-production',
  });

  app.addHook('preHandler', async (req, reply) => {
    if (MAINTENANCE && !req.url.startsWith('/api/maintenance') && !req.url.startsWith('/api/health')) {
      return reply.status(503).send({ code: 'MAINTENANCE', message: 'Under maintenance' });
    }
  });
}

export async function registerRoutes(app: FastifyInstance) {
  function getSessionFromRequest(req: {
    headers: Record<string, string | string[] | undefined>;
    cookies: Record<string, string | undefined>;
  }): string {
    const headerVal = req.headers[SESSION_HEADER];
    const headerSession = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    return resolveSessionId(headerSession, req.cookies[SESSION_COOKIE]);
  }

  function attachSessionHeader(reply: { header: (k: string, v: string) => void }, sessionId: string) {
    reply.header('X-Session-Id', sessionId);
  }

  app.get('/api/maintenance', async () => ({ maintenance: MAINTENANCE }));

  app.post('/api/session', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    return { sessionId };
  });

  app.post('/api/session/socket-token', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    return { token: sessionId };
  });

  app.post('/api/solo/games', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const body = req.body as { displayName: string; difficulty: string; durationSeconds: number };

    const gameManager = await getGameManager();

    if (!gameManager.canStartGame()) {
      return reply.status(503).send({ code: 'CAPACITY_FULL', message: 'Maximum games in progress. Try again soon.' });
    }

    try {
      const gameManager = await getGameManager();
      const game = await gameManager.createSoloGameAsync({
        sessionId,
        displayName: body.displayName,
        difficulty: body.difficulty as 'easy' | 'medium' | 'hard',
        durationSeconds: body.durationSeconds,
        dictionary: getGridDictionary(),
      });
      updateSession(sessionId, { displayName: body.displayName });
      return { gameId: game.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(503).send({ code: msg, message: msg });
    }
  });

  app.get('/api/games/:gameId', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const { gameId } = req.params as { gameId: string };
    const gameManager = await getGameManager();
    const game = gameManager.getGame(gameId);
    if (!game) return reply.status(404).send({ message: 'Not found' });
    return gameManager.toClientState(game, sessionId);
  });

  app.get('/api/games/:gameId/results', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const { gameId } = req.params as { gameId: string };
    const gameManager = await getGameManager();
    const game = gameManager.getGame(gameId);
    if (!game) return reply.status(404).send({ message: 'Not found' });
    const results = gameManager.getResults(gameId);
    if (!results) return reply.status(409).send({ message: 'Results not ready' });
    const participant = results.find((r) => r.sessionId === sessionId);
    if (!participant) return reply.status(403).send({ message: 'Not a participant' });
    return { rankings: results };
  });

  app.post('/api/games/:gameId/submit', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const { gameId } = req.params as { gameId: string };
    const body = req.body as { path: number[]; idempotencyKey: string };

    try {
      const gameManager = await getGameManager();
      const result = await gameManager.handleSubmitAsync(
        gameId,
        sessionId,
        body.path,
        body.idempotencyKey,
        getGridDictionary(),
        lookupWord,
      );
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(409).send({ code: msg, message: msg });
    }
  });

  app.post('/api/rooms', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const body = req.body as { displayName: string; maxPlayers: number; durationSeconds: number };
    try {
      const room = roomManager.createRoom({ sessionId, ...body });
      updateSession(sessionId, { displayName: body.displayName });
      return roomManager.toResponse(room, getPublicUrl());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(400).send({ code: msg, message: msg });
    }
  });

  app.post('/api/rooms/join', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const body = req.body as { displayName: string; code?: string; inviteToken?: string };
    try {
      const room = roomManager.joinRoom({ sessionId, ...body });
      updateSession(sessionId, { displayName: body.displayName });
      return roomManager.toResponse(room, getPublicUrl());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      const status = msg === 'RATE_LIMITED' ? 429 : 400;
      return reply.status(status).send({ code: msg, message: msg });
    }
  });

  app.get('/api/rooms/:roomId', async (req, reply) => {
    const sessionId = getSessionFromRequest(req);
    attachSessionHeader(reply, sessionId);
    const { roomId } = req.params as { roomId: string };
    const room = roomManager.getRoom(roomId);
    if (!room) return reply.status(404).send({ code: 'ROOM_NOT_FOUND' });
    return roomManager.toResponse(room, getPublicUrl());
  });
}
