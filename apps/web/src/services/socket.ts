import { io, type Socket } from 'socket.io-client';
import { getApiBase, getSessionId } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const base = getApiBase();
    if (!base) {
      throw new Error('VITE_API_URL is not configured');
    }
    socket = io(base, {
      auth: { sessionId: getSessionId() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function reconnectSocket(sessionId: string) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const base = getApiBase();
  socket = io(base, {
    auth: { sessionId },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
