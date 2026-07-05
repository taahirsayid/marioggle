import { MIN_PLAYERS } from '@marioggle/shared';
import type { Room } from '../room/roomManager.js';

export function canStartRoom(room: Room): boolean {
  const connected = [...room.players.values()].filter((p) => p.status === 'connected');
  return connected.length >= MIN_PLAYERS && !room.gameStarted;
}

export function connectedPlayers(room: Room) {
  return [...room.players.values()].filter((p) => p.status === 'connected');
}
