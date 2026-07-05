import type { FastifyInstance } from 'fastify';

const PORT = Number(process.env.PORT ?? 3001);

function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? process.env.PUBLIC_URL ?? '';
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const { default: Fastify } = await import('fastify');
  const app = Fastify({ logger: true }) as FastifyInstance;

  app.get('/api/health', async () => {
    const { isDictionaryLoaded, isDictionaryLoading } = await import('./dictionary/loader.js');
    return {
      ok: true,
      status: 'ready',
      dictionary: isDictionaryLoaded(),
      dictionaryLoading: isDictionaryLoading(),
    };
  });

  app.get('/', async () => ({ ok: true, service: 'marioggle-api', health: '/api/health' }));

  // Fastify plugins and parsers must be registered before listen().
  const { registerRoutes } = await import('./app.js');
  await registerRoutes(app);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Health endpoint live on 0.0.0.0:${PORT}`);

  const { startDictionaryLoad } = await import('./dictionary/loader.js');
  startDictionaryLoad();

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
