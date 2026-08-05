import type { StateChange } from "./core/StateMachine";
import type {
  BetMap,
  BetSettlement,
  BetType,
  CardData,
  DealStep,
  GameState,
  RoadmapSnapshot,
  RoundResult,
  ViewportMetrics,
} from "./types";

/**
 * The engine's internal message catalogue.
 *
 * Managers publish here and views subscribe; no manager holds a reference to
 * another. That is what lets the roadmap, the HUD and the table be added,
 * removed or reskinned without touching game logic.
 */
export interface GameEventMap {
  /* Lifecycle -------------------------------------------------------- */
  "game:booted": void;
  "game:ready": void;
  "game:paused": void;
  "game:resumed": void;
  "game:destroyed": void;
  "game:error": { code: string; message: string; fatal: boolean };

  /* Loading ---------------------------------------------------------- */
  "assets:progress": { progress: number; label: string };
  "assets:complete": void;

  /* State machine ---------------------------------------------------- */
  "state:changed": StateChange<GameState>;

  /* Round ------------------------------------------------------------ */
  "round:start": { roundId: string; coup: number; shoeId: string };
  "round:bettingOpen": { roundId: string; durationSeconds: number };
  "round:bettingClosed": { roundId: string };
  "round:dealStep": { step: DealStep; playerTotal: number; bankerTotal: number };
  "round:burn": { cards: readonly CardData[] };
  "round:result": { result: RoundResult };
  "round:settled": {
    settlements: readonly BetSettlement[];
    totalStake: number;
    totalReturn: number;
    netProfit: number;
    commission: number;
  };
  "round:end": { roundId: string };
  "round:reset": void;

  /* Timer ------------------------------------------------------------ */
  "timer:tick": { remainingSeconds: number; totalSeconds: number; urgent: boolean };
  "timer:expired": void;

  /* Betting ---------------------------------------------------------- */
  "bet:chipSelected": { value: number; index: number };
  "bet:placed": { betType: BetType; amount: number; chipValue: number; total: number };
  "bet:rejected": { betType: BetType; reason: string; message: string };
  "bet:changed": { bets: BetMap; total: number; canUndo: boolean; canRepeat: boolean };
  "bet:cleared": void;
  "bet:undone": { betType: BetType; amount: number };
  "bet:repeated": { bets: BetMap };
  "bet:doubled": { bets: BetMap };
  "bet:confirmed": { bets: BetMap };

  /* Wallet ----------------------------------------------------------- */
  "balance:changed": { balance: number; delta: number; reason: string };

  /* Hands ------------------------------------------------------------ */
  "hand:scoreChanged": { player: number; banker: number };
  "hand:revealed": { side: "player" | "banker"; total: number };

  /* History / roadmaps ------------------------------------------------ */
  "roadmap:updated": { snapshot: RoadmapSnapshot };
  "shoe:changed": { shoeId: string; cardsRemaining: number };

  /* Presentation ------------------------------------------------------ */
  "view:resized": { metrics: ViewportMetrics };
  "audio:muteChanged": { muted: boolean };
  "audio:volumeChanged": { master: number; music: number; sfx: number };

  /* Connectivity ------------------------------------------------------ */
  "net:connected": { balance: number };
  "net:disconnected": { reason: string; willReconnect: boolean };
}

export type GameEventName = keyof GameEventMap;
