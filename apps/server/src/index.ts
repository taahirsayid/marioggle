import { buildApp } from './app.js';
import { attachSocketHandlers } from './ws/socketHandler.js';
import { startDictionaryLoad } from './dictionary/loader.js';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);

function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? process.env.PUBLIC_URL ?? '';
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const app = await buildApp();

  // Listen immediately so Render health checks pass within 5 seconds.
  await app.listen({ port: PORT, host: '0.0.0.0' });

  const io = new Server(app.server, {
    cors: {
      origin: getCorsOrigins(),
      credentials: true,
    },
    path: '/socket.io',
  });

  attachSocketHandlers(io);
  console.log(`Marioggle server listening on port ${PORT}`);

  // Load WordNet trie in background (can take several seconds on free tier).
  startDictionaryLoad();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
