import type { GamePhase } from './phases';

/**
 * Typed Socket.io contract shared by client and server.
 *
 * Naming convention: `domain:action`. Server→client events describe facts
 * ("round:phase" changed); client→server events describe intents
 * ("bet:place"). The full betting/cashout surface lands with the backend
 * phase — this file starts with the synchronisation core so the transport
 * layer is typed end-to-end from day one.
 */

/** Snapshot of the authoritative round state, used for join & recovery. */
export interface RoundSnapshot {
  roundId: string;
  phase: GamePhase;
  /** Current multiplier (1.0 while not running). */
  multiplier: number;
  /** Server epoch ms when the current phase began. */
  phaseStartedAt: number;
  /** Server epoch ms "now" — lets the client estimate clock offset. */
  serverTime: number;
}

export interface ServerToClientEvents {
  /** Sent once on connection with the authoritative state of the world. */
  'sync:snapshot': (snapshot: RoundSnapshot) => void;
  /** Phase transitions of the authoritative round loop. */
  'round:phase': (payload: { roundId: string; phase: GamePhase; at: number }) => void;
  /** High-frequency multiplier stream while a round is running. */
  'round:tick': (payload: { roundId: string; multiplier: number; at: number }) => void;
}

export interface ClientToServerEvents {
  /** Explicit state request (reconnect recovery). */
  'sync:request': () => void;
}

/** Per-socket data the server attaches after authentication. */
export interface SocketData {
  playerId: string;
}
