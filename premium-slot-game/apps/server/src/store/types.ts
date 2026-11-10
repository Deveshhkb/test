import type { FreeSpinsState, RoundOutcome, Grid } from '@neon/game-math';

export interface UserRecord {
  id: string;
  nickname: string;
  balance: number;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  sequence: number;
  freeSpins: FreeSpinsState | null;
  pendingBonusRoundId: string | null;
  lastRoundId: string | null;
  updatedAt: Date;
}

export type RoundStatus = 'SETTLING' | 'BONUS_PENDING' | 'COMPLETED';

export interface RoundRecord {
  id: string;
  userId: string;
  sessionId: string;
  sequence: number;
  idempotencyKey: string;
  mode: 'BASE' | 'FREE_SPIN';
  bet: number;
  outcome: RoundOutcome;
  status: RoundStatus;
  bonusPicks: number[];
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export type TransactionType = 'BET' | 'WIN' | 'BONUS_WIN';

export interface TransactionRecord {
  id: string;
  /** Unique key: `${roundId}:${type}` – guarantees no duplicate processing. */
  key: string;
  userId: string;
  roundId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface HistoryRecord {
  roundId: string;
  userId: string;
  sequence: number;
  mode: 'BASE' | 'FREE_SPIN';
  bet: number;
  win: number;
  bonusWin: number;
  winTier: string;
  balanceAfter: number;
  finalGrid: Grid;
  createdAt: Date;
}

export class DuplicateKeyError extends Error {
  constructor(key: string) {
    super(`Duplicate key ${key}`);
  }
}

export interface Store {
  readonly kind: 'memory' | 'mongo';
  users: {
    create(user: UserRecord): Promise<UserRecord>;
    get(id: string): Promise<UserRecord | null>;
    /**
     * Atomically adds `delta` to the balance. When the result would be negative the
     * update is rejected and `null` is returned.
     */
    adjustBalance(id: string, delta: number): Promise<number | null>;
  };
  sessions: {
    getByUser(userId: string): Promise<SessionRecord | null>;
    save(session: SessionRecord): Promise<void>;
  };
  rounds: {
    insert(round: RoundRecord): Promise<void>;
    update(id: string, patch: Partial<RoundRecord>): Promise<void>;
    get(id: string): Promise<RoundRecord | null>;
    findByIdempotency(userId: string, key: string): Promise<RoundRecord | null>;
    findByStatus(userId: string, status: RoundStatus): Promise<RoundRecord[]>;
  };
  transactions: {
    /** Throws DuplicateKeyError if the key already exists. */
    insert(tx: TransactionRecord): Promise<void>;
    findByKey(key: string): Promise<TransactionRecord | null>;
    listByUser(userId: string): Promise<TransactionRecord[]>;
  };
  history: {
    insert(entry: HistoryRecord): Promise<void>;
    update(roundId: string, patch: Partial<HistoryRecord>): Promise<void>;
    list(userId: string, limit: number): Promise<HistoryRecord[]>;
  };
  close(): Promise<void>;
}
