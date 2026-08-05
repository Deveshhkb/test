import type { Application } from "pixi.js";

import type { AssetLoader } from "./AssetLoader";
import type { GameConfig } from "./Config";
import type { StateMachine } from "./core/StateMachine";
import type { ServiceContainer } from "./core/ServiceContainer";
import type { GameEventMap } from "./events";
import type { AnimationManager } from "./managers/AnimationManager";
import type { AudioManager } from "./managers/AudioManager";
import type { BetManager } from "./managers/BetManager";
import type { CardManager } from "./managers/CardManager";
import type { HistoryManager } from "./managers/HistoryManager";
import type { InputManager } from "./managers/InputManager";
import type { ResizeManager } from "./managers/ResizeManager";
import type { RoadmapManager } from "./managers/RoadmapManager";
import type { NetworkAdapter } from "./net/protocol";
import type { GameState, ViewportMetrics } from "./types";
import type { EventBus } from "./utils/EventBus";

/**
 * The dependency bundle handed to every manager, scene and display object.
 *
 * This is the engine's composition root made explicit: no module reaches for a
 * singleton or imports a sibling manager, they all receive this. Type-only
 * imports keep it free of runtime cycles.
 *
 * `config` is intentionally mutable — `updateConfig()` swaps it in place and
 * consumers read `ctx.config` at the point of use rather than caching it.
 */
export interface GameContext {
  config: GameConfig;
  metrics: ViewportMetrics;

  readonly app: Application;
  readonly bus: EventBus<GameEventMap>;
  readonly services: ServiceContainer;
  readonly assets: AssetLoader;
  readonly state: StateMachine<GameState>;

  readonly animation: AnimationManager;
  readonly audio: AudioManager;
  readonly bets: BetManager;
  readonly cards: CardManager;
  readonly history: HistoryManager;
  readonly roadmaps: RoadmapManager;
  readonly resize: ResizeManager;
  readonly input: InputManager;
  readonly network: NetworkAdapter;
}

/** Anything that participates in the layout pass. */
export interface Responsive {
  layout(metrics: ViewportMetrics): void;
}

/** Anything holding GPU resources or subscriptions. */
export interface Disposable {
  destroy(): void;
}
