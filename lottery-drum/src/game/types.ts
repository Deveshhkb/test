/** Phases of one draw, in the order the reference clip plays them. */
export type GameState =
  | 'idle'
  | 'spinning'
  | 'draining'
  | 'settling'
  | 'revealing'
  | 'returning';

export interface DebugSnapshot {
  fps: number;
  state: GameState;
  elapsed: number;
  drumOmega: number;
  zoom: number;
  activeBalls: number;
  contacts: number;
  subSteps: number;
  winnerNumber: number | null;
  winnerX: number;
  winnerY: number;
  winnerVx: number;
  winnerVy: number;
}

/** Everything the Pixi layer publishes to React. */
export interface GameEvents extends Record<string, unknown> {
  stateChanged: GameState;
  resultRevealed: number;
  drawStarted: number;
  debugSnapshot: DebugSnapshot;
  historyChanged: readonly number[];
}
