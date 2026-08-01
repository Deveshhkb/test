import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  RoundSnapshot,
  ServerToClientEvents,
  SocketData,
} from '@aviator/shared';
import { GamePhase } from '@aviator/shared';
import { randomUUID } from 'node:crypto';

export type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/**
 * Phase-1 placeholder for the authoritative round state. The real
 * RoundEngine (provably-fair crash point, phase timers, Redis-backed
 * multi-instance sync) replaces this in the backend phase — the socket
 * contract stays identical, which is the point of stubbing it now.
 */
function currentSnapshot(): RoundSnapshot {
  const now = Date.now();
  return {
    roundId: 'round-0',
    phase: GamePhase.Waiting,
    multiplier: 1,
    phaseStartedAt: now,
    serverTime: now,
  };
}

export function registerSocketHandlers(io: GameServer): void {
  io.on('connection', (socket: GameSocket) => {
    // Anonymous session identity for now; real auth arrives with accounts.
    socket.data.playerId = randomUUID();

    socket.emit('sync:snapshot', currentSnapshot());

    socket.on('sync:request', () => {
      socket.emit('sync:snapshot', currentSnapshot());
    });
  });
}
