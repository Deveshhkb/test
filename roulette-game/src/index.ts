/**
 * Public entry point of the Roulette engine.
 *
 * A host application needs exactly two things from this module: a way to create
 * a game, and the types to talk to it. Everything else is exported for
 * completeness (custom themes, custom locales, backend wiring), not because a
 * basic integration requires it.
 *
 * ```ts
 * import { createRouletteGame } from '@casino/roulette-engine';
 *
 * const game = createRouletteGame({ timing: { bettingDuration: 20 } });
 * await game.init(document.getElementById('table')!);
 * // ... later
 * game.destroy();
 * ```
 *
 * See docs/REACT_INTEGRATION.md and docs/STANDALONE.md.
 */

import { Game, GameOptions } from './Game/Game';
import { PartialGameConfig } from './Types';

/* ------------------------------------------------------------------------- */
/* Factory                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Create an engine instance.
 *
 * Preferred over `new Game(...)` so the concrete class stays an implementation
 * detail and can change without breaking hosts.
 */
export function createRouletteGame(
  config?: PartialGameConfig,
  options?: GameOptions,
): Game {
  return new Game(config, options);
}

/* ------------------------------------------------------------------------- */
/* Core                                                                       */
/* ------------------------------------------------------------------------- */

export { Game };
export type { GameOptions };

/* ------------------------------------------------------------------------- */
/* Configuration & theming                                                    */
/* ------------------------------------------------------------------------- */

export {
  DEFAULT_CONFIG,
  DEFAULT_PAYOUTS,
  THEMES,
  CLASSIC_THEME,
  MIDNIGHT_THEME,
  NOIR_THEME,
  createConfig,
  mergeConfig,
  resolveTheme,
} from './Game/Config';

export { Localization, EN, ES, HI } from './Localization';

/* ------------------------------------------------------------------------- */
/* Domain constants - useful when driving the engine from a backend           */
/* ------------------------------------------------------------------------- */

export {
  EUROPEAN_WHEEL_ORDER,
  AMERICAN_WHEEL_ORDER,
  RED_NUMBERS,
  getWheelOrder,
  getNumberColor,
  BOARD,
} from './Game/Constants';

export { TableLayout } from './Game/TableLayout';

/* ------------------------------------------------------------------------- */
/* Events & utilities                                                         */
/* ------------------------------------------------------------------------- */

export { EventBus } from './Utilities/EventBus';
export { Logger, LogLevel } from './Utilities/Logger';
export { formatCurrency, formatCompact, formatTime } from './Utilities/Helpers';

export type { AssetBundle, AssetEntry } from './Game/AssetLoader';

/* ------------------------------------------------------------------------- */
/* Types                                                                      */
/* ------------------------------------------------------------------------- */

export {
  GameState,
  GameEvent,
  BetType,
  WheelType,
  PocketColor,
  SoundId,
  Orientation,
  Breakpoint,
} from './Types';

export type {
  IRouletteGame,
  GameConfig,
  PartialGameConfig,
  WheelConfig,
  TimingConfig,
  BettingConfig,
  AudioConfig,
  RenderConfig,
  NetworkConfig,
  ChipDenomination,
  Theme,
  LocaleStrings,
  Bet,
  BetSpot,
  BetResolution,
  RoundResult,
  HistoryEntry,
  Statistics,
  LayoutMetrics,
  SafeAreaInsets,
  Pocket,
  RouletteNumber,
  GameEventPayloads,
} from './Types';
