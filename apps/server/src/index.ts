import { buildApp } from './app.js';
import { attachSocketHandlers } from './ws/socketHandler.js';
import { loadDictionary } from './dictionary/loader.js';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);

function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? process.env.PUBLIC_URL ?? '';
  if (!raw) return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  try {
    loadDictionary();
  } catch (err) {
    console.error('Dictionary failed to load:', err);
  }

  const app = await buildApp();
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
