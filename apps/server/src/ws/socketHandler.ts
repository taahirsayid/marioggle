import type { Server, Socket } from 'socket.io';
import { getGameManager } from '../lazyServices.js';
import { roomManager } from '../room/roomManager.js';
import { getGridDictionary } from '../dictionary/gridDictionary.js';
import { lookupWord } from '../dictionary/dictionaryApi.js';
import { canStartRoom, connectedPlayers } from '../room/roomHelpers.js';

const socketSessions = new Map<string, string>();
const sessionSockets = new Map<string, string>();

function getSessionId(socket: Socket): string | undefined {
  return (socket.handshake.auth?.sessionId as string) ?? socketSessions.get(socket.id);
}

export async function attachSocketHandlers(io: Server) {
  const gameManager = await getGameManager();

  gameManager.setBroadcast((gameId, event, payload, sessionId) => {
    if (sessionId) {
      const socketId = sessionSockets.get(sessionId);
      if (socketId) {
        io.to(socketId).emit(event, payload);
      }
      return;
    }
    io.to(`game:${gameId}`).emit(event, payload);
  });

  io.on('connection', (socket: Socket) => {
    const sessionId = getSessionId(socket);
    if (!sessionId) {
      socket.emit('error', { code: 'NO_SESSION', message: 'Missing session' });
      socket.disconnect();
      return;
    }

    const existingSocket = sessionSockets.get(sessionId);
    if (existingSocket && existingSocket !== socket.id) {
      io.sockets.sockets.get(existingSocket)?.disconnect(true);
    }

    socketSessions.set(socket.id, sessionId);
    sessionSockets.set(sessionId, socket.id);

    socket.on('join_room', ({ roomId }: { roomId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }
      socket.join(`room:${roomId}`);
      const baseUrl = process.env.PUBLIC_URL ?? 'https://taahirsayid.github.io/marioggle';
      socket.emit('room_state', roomManager.toResponse(room, baseUrl));
    });

    socket.on('start_game', async ({ roomId }: { roomId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }
      if (room.hostSessionId !== sessionId) {
        socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start' });
        return;
      }
      if (!canStartRoom(room)) {
        socket.emit('error', { code: 'INVALID_STATE', message: 'Need at least 2 players' });
        return;
      }

      try {
        const dictionary = getGridDictionary();
        const players = connectedPlayers(room).map((p) => ({
          sessionId: p.sessionId,
          displayName: p.displayName,
          visualId: p.visualId,
        }));
        const game = await gameManager.createMultiplayerGameAsync(roomId, {
          hostSessionId: room.hostSessionId,
          durationSeconds: room.durationSeconds,
          dictionary,
          players,
        });
        roomManager.markGameStarted(roomId, game.id);

        for (const p of players) {
          const sid = sessionSockets.get(p.sessionId);
          if (sid) {
            io.sockets.sockets.get(sid)?.join(`game:${game.id}`);
          }
        }

        io.to(`room:${roomId}`).emit('game_started', { gameId: game.id });
        io.to(`game:${game.id}`).emit('countdown_started', {
          countdownEndsAt: game.countdownEndsAt,
          serverNow: Date.now(),
        });
        gameManager.emitGameState(game.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start';
        socket.emit('error', { code: msg, message: msg });
      }
    });

    socket.on('join_game', ({ gameId }: { gameId: string }) => {
      const game = gameManager.getGame(gameId);
      if (!game) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Game not found' });
        return;
      }
      socket.join(`game:${gameId}`);
      socket.emit('game_state', gameManager.toClientState(game, sessionId));
    });

    socket.on(
      'submit_word',
      async ({
        gameId,
        path,
        idempotencyKey,
      }: {
        gameId: string;
        path: number[];
        idempotencyKey: string;
      }) => {
        try {
          await gameManager.handleSubmitAsync(
            gameId,
            sessionId,
            path,
            idempotencyKey,
            getGridDictionary(),
            lookupWord,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Submit failed';
          socket.emit('error', { code: msg, message: msg });
        }
      },
    );

    socket.on('disconnect', () => {
      socketSessions.delete(socket.id);
      if (sessionSockets.get(sessionId) === socket.id) {
        sessionSockets.delete(sessionId);
      }
    });
  });
}

export function emitRoomState(roomId: string, io: Server) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  const baseUrl = process.env.PUBLIC_URL ?? 'https://taahirsayid.github.io/marioggle';
  io.to(`room:${roomId}`).emit('room_state', roomManager.toResponse(room, baseUrl));
}
