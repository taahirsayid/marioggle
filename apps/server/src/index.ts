import type { FastifyInstance } from 'fastify';

const PORT = Number(process.env.PORT ?? 3001);

function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? process.env.PUBLIC_URL ?? '';
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const { default: Fastify } = await import('fastify');
  const app = Fastify({
    logger: true,
    // Keep health probes fast under load on free-tier instances.
    connectionTimeout: 120_000,
    requestTimeout: 120_000,
  }) as FastifyInstance;

  app.get('/', async () => ({ ok: true, service: 'marioggle-api', health: '/api/health' }));
  app.get('/api/health', async () => ({
    ok: true,
    status: 'ready',
    dictionary: 'api',
  }));

  const { configureApp, registerRoutes } = await import('./app.js');
  await configureApp(app);
  await registerRoutes(app);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Health endpoint live on 0.0.0.0:${PORT}`);

  // Warm game engine in background after health checks have passed.
  setTimeout(() => {
    void import('./lazyServices.js').then((m) => m.getGameManager());
    void initRealtime(app);
  }, 2000);
}

async function initRealtime(app: FastifyInstance) {
  const { Server } = await import('socket.io');
  const io = new Server(app.server, {
    cors: {
      origin: getCorsOrigins(),
      credentials: true,
    },
    path: '/socket.io',
  });

  const { attachSocketHandlers } = await import('./ws/socketHandler.js');
  await attachSocketHandlers(io);

  console.log('Marioggle API fully initialized');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
