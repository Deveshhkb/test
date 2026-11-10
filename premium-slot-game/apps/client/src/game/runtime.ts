import type { GameApplication } from './core/GameApplication';
import type { GameFlowController } from './core/GameFlowController';

/** Module-level handle so React controls can reach the running game. */
export const runtime: { app: GameApplication | null; controller: GameFlowController | null } = { app: null, controller: null };

declare global {
  interface Window {
    __NEON__?: { getGrid(): string[][]; runtime: typeof runtime };
  }
}
