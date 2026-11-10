import { z } from 'zod';
import type { BossFightOutcome, GameConfig, Grid, RoundOutcome } from '@neon/game-math';

export const SpinRequestSchema = z.object({
  bet: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(128),
});
export type SpinRequest = z.infer<typeof SpinRequestSchema>;

export const BonusPickSchema = z.object({
  roundId: z.string().min(1),
  targetIndex: z.number().int().min(0).max(15),
  idempotencyKey: z.string().min(8).max(128),
});
export type BonusPickRequest = z.infer<typeof BonusPickSchema>;

export const DemoAuthSchema = z.object({
  nickname: z.string().trim().min(1).max(24).optional(),
  userId: z.string().max(64).optional(),
});

/** Boss fight data sent to the client: rewards are NOT included until revealed. */
export interface PublicBossFight {
  roundId: string;
  shots: number;
  targets: number;
  bossHp: number;
  picks: { shot: number; targetIndex: number; multiplier: number; damage: number; decoys: number[] }[];
  hpRemaining: number;
  completed: boolean;
  totalMultiplier: number;
  totalWin: number;
  bet: number;
}

export interface PublicFreeSpins {
  remaining: number;
  total: number;
  played: number;
  multiplier: number;
  totalWin: number;
  bet: number;
}

/** Round outcome as sent to the client (boss fight rewards stripped). */
export type PublicOutcome = Omit<RoundOutcome, 'bossFight'> & { bossFight: null };

export interface SpinResponse {
  roundId: string;
  sequence: number;
  outcome: PublicOutcome;
  balanceBefore: number;
  balanceAfter: number;
  bossFight: PublicBossFight | null;
  freeSpins: PublicFreeSpins | null;
  createdAt: string;
}

export interface BonusPickResponse {
  bossFight: PublicBossFight;
  pick: PublicBossFight['picks'][number];
  balanceAfter: number;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  nickname: string;
  balance: number;
  sequence: number;
  freeSpins: PublicFreeSpins | null;
  bossFight: PublicBossFight | null;
  lastRound: SpinResponse | null;
}

export interface HistoryEntry {
  roundId: string;
  sequence: number;
  mode: 'BASE' | 'FREE_SPIN';
  bet: number;
  win: number;
  bonusWin: number;
  winTier: string;
  balanceAfter: number;
  finalGrid: Grid;
  createdAt: string;
}

export interface PublicConfig {
  config: GameConfig;
  maxWays: number;
  currency: string;
}

export function toPublicBossFight(
  roundId: string,
  bet: number,
  cfg: GameConfig['bossFight'],
  outcome: BossFightOutcome,
  picks: number[],
): PublicBossFight {
  const revealed = picks.map((targetIndex, shot) => ({
    shot,
    targetIndex,
    multiplier: outcome.rewards[shot],
    damage: outcome.damage[shot],
    decoys: outcome.decoys[shot],
  }));
  const dealt = revealed.reduce((a, p) => a + p.damage, 0);
  const completed = picks.length >= cfg.shots;
  return {
    roundId,
    shots: cfg.shots,
    targets: cfg.targets,
    bossHp: cfg.bossHp,
    picks: revealed,
    hpRemaining: cfg.bossHp - dealt,
    completed,
    totalMultiplier: revealed.reduce((a, p) => a + p.multiplier, 0),
    totalWin: completed ? outcome.totalWin : Math.floor(revealed.reduce((a, p) => a + p.multiplier, 0) * bet),
    bet,
  };
}

/** Socket.io event names. */
export const SocketEvents = {
  // client -> server
  JOIN: 'game:join',
  SPIN: 'game:spin',
  BONUS_PICK: 'game:bonusPick',
  RESUME: 'game:resume',
  // server -> client
  STATE: 'game:state',
  SPIN_ACCEPTED: 'game:spinAccepted',
  REELS: 'game:reels',
  CASCADE: 'game:cascade',
  WIN: 'game:win',
  BALANCE: 'game:balance',
  FREE_SPINS: 'game:freeSpins',
  BONUS: 'game:bonus',
  ERROR: 'game:error',
} as const;

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'INVALID_BET'
  | 'INSUFFICIENT_FUNDS'
  | 'SPIN_IN_PROGRESS'
  | 'BONUS_PENDING'
  | 'NO_BONUS'
  | 'NOT_FOUND'
  | 'INTERNAL';

export interface ApiError {
  error: { code: ApiErrorCode; message: string };
}

export type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: ApiError['error'] }) => void;
