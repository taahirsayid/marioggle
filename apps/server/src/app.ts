import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { gameManager } from './game/gameManager.js';
import { roomManager } from './room/roomManager.js';
import { loadDictionary, isDictionaryAvailable } from './dictionary/loader.js';

const SESSION_COOKIE = 'marioggle_session';
const MAINTENANCE = process.env.MAINTENANCE_MODE === 'true';

const sessions = new Map<string, { displayName?: string; createdAt: number }>();

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-secret-change-in-production',
  });

  app.addHook('preHandler', async (req, reply) => {
    if (MAINTENANCE && !req.url.startsWith('/api/maintenance')) {
      return reply.status(503).send({ code: 'MAINTENANCE', message: 'Under maintenance' });
    }
  });

  function getOrCreateSession(req: { cookies: Record<string, string | undefined> }, reply: { setCookie: Function }) {
    let sessionId = req.cookies[SESSION_COOKIE];
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = randomUUID();
      sessions.set(sessionId, { createdAt: Date.now() });
      reply.setCookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
    }
    return sessionId;
  }

  app.get('/api/health', async () => ({
    ok: true,
    dictionary: isDictionaryAvailable(),
    activeGames: gameManager.getActiveGameCount(),
  }));

  app.get('/api/maintenance', async () => ({ maintenance: MAINTENANCE }));

  app.post('/api/session', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    return { sessionId };
  });

  app.post('/api/session/socket-token', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    return { token: sessionId };
  });

  app.post('/api/solo/games', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    const body = req.body as { displayName: string; difficulty: string; durationSeconds: number };

    if (!isDictionaryAvailable()) {
      return reply.status(503).send({ code: 'DICTIONARY_UNAVAILABLE' });
    }

    if (!gameManager.canStartGame()) {
      return reply.status(503).send({ code: 'CAPACITY_FULL', message: 'Maximum games in progress. Try again soon.' });
    }

    try {
      const dictionary = loadDictionary();
      const game = gameManager.createSoloGame({
        sessionId,
        displayName: body.displayName,
        difficulty: body.difficulty as 'easy' | 'medium' | 'hard',
        durationSeconds: body.durationSeconds,
        dictionary,
      });
      sessions.set(sessionId, { ...sessions.get(sessionId)!, displayName: body.displayName });
      return { gameId: game.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(503).send({ code: msg, message: msg });
    }
  });

  app.get('/api/games/:gameId', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    const { gameId } = req.params as { gameId: string };
    const game = gameManager.getGame(gameId);
    if (!game) return reply.status(404).send({ message: 'Not found' });
    return gameManager.toClientState(game, sessionId);
  });

  app.post('/api/games/:gameId/submit', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    const { gameId } = req.params as { gameId: string };
    const body = req.body as { path: number[]; idempotencyKey: string };

    try {
      const dictionary = loadDictionary();
      const result = gameManager.handleSubmit(
        gameId,
        sessionId,
        body.path,
        body.idempotencyKey,
        dictionary,
      );
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(409).send({ code: msg, message: msg });
    }
  });

  app.post('/api/rooms', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    const body = req.body as { displayName: string; maxPlayers: number; durationSeconds: number };
    try {
      const room = roomManager.createRoom({ sessionId, ...body });
      const baseUrl = process.env.PUBLIC_URL ?? '/marioggle';
      return roomManager.toResponse(room, baseUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return reply.status(400).send({ code: msg, message: msg });
    }
  });

  app.post('/api/rooms/join', async (req, reply) => {
    const sessionId = getOrCreateSession(req, reply);
    const body = req.body as { displayName: string; code?: string; inviteToken?: string };
    try {
      const room = roomManager.joinRoom({ sessionId, ...body });
      const baseUrl = process.env.PUBLIC_URL ?? '/marioggle';
      return roomManager.toResponse(room, baseUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      const status = msg === 'RATE_LIMITED' ? 429 : 400;
      return reply.status(status).send({ code: msg, message: msg });
    }
  });

  return app;
}
