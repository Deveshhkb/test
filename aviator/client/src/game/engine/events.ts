import type { GamePhase } from '@aviator/shared';

/**
 * Every event the engine publishes, in one typed map. Lives in its own
 * module so subsystems (RoundDirector, scenes, the React bridge) can
 * depend on the event types without importing GameEngine itself.
 */
export interface EngineEvents extends Record<string, unknown> {
  'engine:ready': undefined;
  'engine:fps': number;
  'engine:resize': { width: number; height: number };
  'phase:changed': { from: GamePhase; to: GamePhase };

  /** Bet window opened; payload is its duration in seconds. */
  'round:betting': { durationSeconds: number };
  /** Countdown tick — payload is whole seconds remaining (3, 2, 1). */
  'round:countdown': number;
  /** The plane leaves the runway. */
  'round:takeoff': { roundId: string };
  /** Multiplier update, emitted every frame while the round runs. */
  'round:multiplier': number;
  /** The round crashed at this final multiplier. */
  'round:crashed': { roundId: string; multiplier: number };
  /** Scene should clear transient round visuals for the next round. */
  'round:reset': undefined;
}
