/**
 * Public entry point for the Baccarat engine.
 *
 * Host applications should import from here and nowhere else — everything
 * exported below is API the engine intends to keep stable. Deep imports into
 * `game/**` are internals and may change.
 */

export { BaccaratGame, NETWORK_ADAPTER, type BaccaratGameOptions } from "./game/BaccaratGame";

export {
  DEFAULT_CONFIG,
  createConfig,
  mergeConfig,
  type AnimationConfig,
  type AssetConfig,
  type AudioConfig,
  type ChipDefinition,
  type DeepPartial,
  type FeatureConfig,
  type GameConfig,
  type NetworkConfig,
  type PayoutTable,
  type RuleConfig,
  type TableConfig,
  type ThemeConfig,
  type TimingConfig,
} from "./game/Config";

export type { GameEventMap, GameEventName } from "./game/events";

export {
  ALL_BET_TYPES,
  BetType,
  DerivedMark,
  GameState,
  HandSide,
  LayoutMode,
  Rank,
  RoundOutcome,
  Suit,
  cardKey,
  rankLabel,
  type BetAction,
  type BetLimit,
  type BetMap,
  type BetSettlement,
  type BigRoadCell,
  type CardData,
  type DealStep,
  type DerivedCell,
  type HandSnapshot,
  type PlayerAccount,
  type RoadEntry,
  type RoadStats,
  type RoadmapSnapshot,
  type RoundResult,
  type Unsubscribe,
  type ViewportMetrics,
} from "./game/types";

/* Rules — useful for server-side validation or a house-edge calculator. */
export { BaccaratRules } from "./game/rules/BaccaratRules";
export { RoadmapEngine } from "./game/rules/RoadmapEngine";

/* Networking — implement `NetworkAdapter` to plug in your own backend. */
export {
  ClientEvent,
  ConnectionState,
  ServerEvent,
  type BalanceUpdatePayload,
  type BetAcceptedPayload,
  type BetRejectedPayload,
  type BettingClosedPayload,
  type BettingOpenPayload,
  type ClientEventMap,
  type ConnectedPayload,
  type DealCardPayload,
  type NetworkAdapter,
  type NetworkAdapterFactory,
  type ResultPayload,
  type RoundEndPayload,
  type RoundStartPayload,
  type ServerEventMap,
  type SyncHistoryPayload,
  type UpdateTimerPayload,
} from "./game/net/protocol";

export { LocalRngAdapter, Shoe, simulateRound } from "./game/net/LocalRngAdapter";
export { SocketAdapter, type SocketAdapterOptions, type SocketLike } from "./game/net/SocketAdapter";

export { Logger, type LogLevel } from "./game/utils/Logger";
export { Sfx } from "./game/managers/AudioManager";
