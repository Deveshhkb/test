import type {
  BetMap,
  BetType,
  CardData,
  DealStep,
  HandSide,
  RoadEntry,
  RoundResult,
} from "../types";

/**
 * Wire protocol.
 *
 * The engine never talks to a socket directly — it consumes these messages from
 * a `NetworkAdapter`. Swapping the built-in RNG for a live Socket.IO table is
 * therefore a one-line change in config, with zero edits to game code.
 */

export enum ServerEvent {
  Connected = "CONNECTED",
  Disconnected = "DISCONNECTED",
  Error = "ERROR",

  /** A new coup exists; betting has not opened yet. */
  RoundStart = "ROUND_START",
  BettingOpen = "BETTING_OPEN",
  BettingClosed = "BETTING_CLOSED",
  /** One physical card reaching the table. */
  DealCard = "DEAL_CARD",
  /** Full settled round. Always sent, even when cards were streamed. */
  Result = "RESULT",
  RoundEnd = "ROUND_END",

  UpdateTimer = "UPDATE_TIMER",
  SyncHistory = "SYNC_HISTORY",
  ShoeChange = "SHOE_CHANGE",
  BurnCard = "BURN_CARD",

  BetAccepted = "BET_ACCEPTED",
  BetRejected = "BET_REJECTED",
  BalanceUpdate = "BALANCE_UPDATE",
}

export enum ClientEvent {
  JoinTable = "JOIN_TABLE",
  LeaveTable = "LEAVE_TABLE",
  PlaceBet = "PLACE_BET",
  CancelBet = "CANCEL_BET",
  ConfirmBets = "CONFIRM_BETS",
  /** Player-driven tables: close betting and deal immediately. */
  Deal = "DEAL",
  RequestHistory = "REQUEST_HISTORY",
}

/* ------------------------------------------------------------------ *
 * Server -> client payloads
 * ------------------------------------------------------------------ */

export interface ConnectedPayload {
  readonly tableId: string;
  readonly balance: number;
  readonly currency: string;
  readonly serverTime: number;
}

export interface DisconnectedPayload {
  readonly reason: string;
  readonly willReconnect: boolean;
}

export interface ErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly fatal: boolean;
}

export interface RoundStartPayload {
  readonly roundId: string;
  readonly shoeId: string;
  /** 1-based coup number inside the current shoe. */
  readonly coup: number;
}

export interface BettingOpenPayload {
  readonly roundId: string;
  /** Zero means "no clock" — the player closes betting by dealing. */
  readonly durationSeconds: number;
  readonly serverTime: number;
}

export interface BettingClosedPayload {
  readonly roundId: string;
}

export interface DealCardPayload {
  readonly roundId: string;
  readonly step: DealStep;
}

export interface BurnCardPayload {
  readonly roundId: string;
  readonly cards: readonly CardData[];
}

export interface ResultPayload {
  readonly result: RoundResult;
}

export interface RoundEndPayload {
  readonly roundId: string;
  readonly nextRoundInSeconds: number;
}

export interface UpdateTimerPayload {
  readonly roundId: string;
  readonly remainingSeconds: number;
  readonly totalSeconds: number;
}

export interface SyncHistoryPayload {
  readonly shoeId: string;
  readonly entries: readonly RoadEntry[];
}

export interface ShoeChangePayload {
  readonly shoeId: string;
  readonly cardsRemaining: number;
}

export interface BetAcceptedPayload {
  readonly roundId: string;
  readonly bets: BetMap;
  readonly balance: number;
}

export interface BetRejectedPayload {
  readonly roundId: string;
  readonly betType: BetType;
  readonly amount: number;
  readonly reason: "LIMIT_MIN" | "LIMIT_MAX" | "INSUFFICIENT_FUNDS" | "CLOSED" | "UNKNOWN";
  readonly message: string;
}

export interface BalanceUpdatePayload {
  readonly balance: number;
  readonly delta: number;
  readonly reason: "BET" | "PAYOUT" | "REFUND" | "SYNC";
}

/** Discriminated map of every server message. */
export interface ServerEventMap {
  [ServerEvent.Connected]: ConnectedPayload;
  [ServerEvent.Disconnected]: DisconnectedPayload;
  [ServerEvent.Error]: ErrorPayload;
  [ServerEvent.RoundStart]: RoundStartPayload;
  [ServerEvent.BettingOpen]: BettingOpenPayload;
  [ServerEvent.BettingClosed]: BettingClosedPayload;
  [ServerEvent.DealCard]: DealCardPayload;
  [ServerEvent.BurnCard]: BurnCardPayload;
  [ServerEvent.Result]: ResultPayload;
  [ServerEvent.RoundEnd]: RoundEndPayload;
  [ServerEvent.UpdateTimer]: UpdateTimerPayload;
  [ServerEvent.SyncHistory]: SyncHistoryPayload;
  [ServerEvent.ShoeChange]: ShoeChangePayload;
  [ServerEvent.BetAccepted]: BetAcceptedPayload;
  [ServerEvent.BetRejected]: BetRejectedPayload;
  [ServerEvent.BalanceUpdate]: BalanceUpdatePayload;
}

/* ------------------------------------------------------------------ *
 * Client -> server payloads
 * ------------------------------------------------------------------ */

export interface PlaceBetPayload {
  readonly roundId: string;
  readonly betType: BetType;
  readonly amount: number;
  readonly chipValue: number;
}

export interface CancelBetPayload {
  readonly roundId: string;
  /** Omit to clear every bet on the layout. */
  readonly betType?: BetType;
}

export interface ConfirmBetsPayload {
  readonly roundId: string;
  readonly bets: BetMap;
}

export interface JoinTablePayload {
  readonly tableId: string;
}

export interface DealPayload {
  readonly roundId: string;
}

export interface RequestHistoryPayload {
  readonly tableId: string;
  readonly limit: number;
}

export interface ClientEventMap {
  [ClientEvent.JoinTable]: JoinTablePayload;
  [ClientEvent.LeaveTable]: JoinTablePayload;
  [ClientEvent.PlaceBet]: PlaceBetPayload;
  [ClientEvent.CancelBet]: CancelBetPayload;
  [ClientEvent.ConfirmBets]: ConfirmBetsPayload;
  [ClientEvent.Deal]: DealPayload;
  [ClientEvent.RequestHistory]: RequestHistoryPayload;
}

/* ------------------------------------------------------------------ *
 * Adapter contract
 * ------------------------------------------------------------------ */

export type ServerEventHandler<K extends ServerEvent> = (payload: ServerEventMap[K]) => void;

export enum ConnectionState {
  Idle = "idle",
  Connecting = "connecting",
  Open = "open",
  Reconnecting = "reconnecting",
  Closed = "closed",
}

/**
 * Everything the engine needs from a transport. Implement this against
 * Socket.IO, a raw WebSocket, a REST poller or an in-process RNG.
 */
export interface NetworkAdapter {
  readonly connectionState: ConnectionState;
  connect(): Promise<void>;
  disconnect(): void;
  send<K extends ClientEvent>(event: K, payload: ClientEventMap[K]): void;
  on<K extends ServerEvent>(event: K, handler: ServerEventHandler<K>): () => void;
  /** Suspends round production (tab hidden / game paused). Optional. */
  pause?(): void;
  resume?(): void;
  destroy(): void;
}

/** Convenience factory signature for DI registration. */
export type NetworkAdapterFactory = () => NetworkAdapter;

/** Card sides used by DEAL_CARD, re-exported so adapters need one import. */
export type { HandSide };
