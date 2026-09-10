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
  /** Seconds of simulation advanced on the last frame. */
  simDelta: number;
  /** True when the frame was slow enough for the loop to clamp its delta. */
  clamped: boolean;
  state: GameState;
  elapsed: number;
  progress: number;
  drumOmega: number;
  drumAngle: number;
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
