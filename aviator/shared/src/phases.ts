/**
 * The full lifecycle of a single crash-game round, plus connection-recovery
 * phases. This is the single source of truth for both the client engine's
 * state machine and the server's authoritative round loop — the two sides
 * must never disagree on what a phase is called.
 */
export const GamePhase = {
  /** Idle between rounds; no round is scheduled yet. */
  Waiting: 'waiting',
  /** Bet window is open; players place / adjust bets. */
  Betting: 'betting',
  /** Bet window closed; short countdown to takeoff. */
  Countdown: 'countdown',
  /** Plane leaves the runway; multiplier is pinned at 1.00x. */
  Takeoff: 'takeoff',
  /** Multiplier is climbing; cashouts are accepted. */
  Running: 'running',
  /** The round has crashed; no further cashouts. */
  Crash: 'crash',
  /** Round results are being presented. */
  Result: 'result',
  /** Big-win celebration presentation (skipped for ordinary rounds). */
  Celebration: 'celebration',
  /** Scene tears down transient state before the next round. */
  Reset: 'reset',
  /** Socket lost; the client is attempting to reconnect. */
  Reconnect: 'reconnect',
  /** Reconnected; re-synchronising to the server's authoritative state. */
  Recovery: 'recovery',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/** Phases that belong to the normal round flow (i.e. not connection recovery). */
export const ROUND_PHASES: readonly GamePhase[] = [
  GamePhase.Waiting,
  GamePhase.Betting,
  GamePhase.Countdown,
  GamePhase.Takeoff,
  GamePhase.Running,
  GamePhase.Crash,
  GamePhase.Result,
  GamePhase.Celebration,
  GamePhase.Reset,
];
