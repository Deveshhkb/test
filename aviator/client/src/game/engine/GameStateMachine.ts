import { GamePhase, ROUND_PHASES } from '@aviator/shared';
import { StateMachine } from './StateMachine';

/**
 * The Aviator round lifecycle as a validated transition table.
 *
 * Normal flow:
 *   waiting → betting → countdown → takeoff → running → crash → result
 *   → (celebration) → reset → betting …
 *
 * `reconnect` is reachable from any phase (the socket can drop at any
 * moment); `recovery` then re-enters whichever phase the server reports.
 */
const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  [GamePhase.Waiting]: [GamePhase.Betting, GamePhase.Reconnect],
  [GamePhase.Betting]: [GamePhase.Countdown, GamePhase.Reconnect],
  [GamePhase.Countdown]: [GamePhase.Takeoff, GamePhase.Reconnect],
  [GamePhase.Takeoff]: [GamePhase.Running, GamePhase.Reconnect],
  [GamePhase.Running]: [GamePhase.Crash, GamePhase.Reconnect],
  [GamePhase.Crash]: [GamePhase.Result, GamePhase.Reconnect],
  [GamePhase.Result]: [GamePhase.Celebration, GamePhase.Reset, GamePhase.Reconnect],
  [GamePhase.Celebration]: [GamePhase.Reset, GamePhase.Reconnect],
  [GamePhase.Reset]: [GamePhase.Waiting, GamePhase.Betting, GamePhase.Reconnect],
  [GamePhase.Reconnect]: [GamePhase.Recovery],
  // After recovery the server snapshot dictates the phase, so every round
  // phase is a legal target.
  [GamePhase.Recovery]: ROUND_PHASES,
};

export function createGameStateMachine(
  initial: GamePhase = GamePhase.Waiting,
): StateMachine<GamePhase> {
  return new StateMachine<GamePhase>(initial, TRANSITIONS);
}
