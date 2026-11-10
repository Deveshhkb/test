import { randomUUID } from 'node:crypto';
import type { GameConfig, RoundOutcome } from '@neon/game-math';
import type {
  BonusPickRequest,
  BonusPickResponse,
  HistoryEntry,
  PublicOutcome,
  SessionState,
  SpinRequest,
  SpinResponse,
} from '@neon/shared';
import type { RoundEngine } from '../game/engine/roundEngine';
import { publicBossFightFor } from '../game/bonus/bossFight';
import { nextFreeSpinsState, toPublicFreeSpins } from '../game/freeSpins/freeSpinsState';
import { isValidBet } from '../game/math/betValidation';
import { DuplicateKeyError, type RoundRecord, type SessionRecord, type Store, type TransactionType } from '../store/types';
import type { Cache } from './cache';
import { AppError } from './errors';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
const LOCK_TTL = 15_000;

export interface GameEvents {
  onSpin?(userId: string, res: SpinResponse): void;
  onBonusPick?(userId: string, res: BonusPickResponse): void;
}

export class GameService {
  constructor(
    private readonly store: Store,
    private readonly cache: Cache,
    private readonly engine: RoundEngine,
    private readonly config: GameConfig,
    private readonly events: GameEvents = {},
  ) {}

  /** Per-user distributed lock (Redis SET NX PX). Prevents concurrent spins/double debits. */
  private async withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const key = `lock:user:${userId}`;
    const token = randomUUID();
    const ok = await this.cache.setNX(key, token, LOCK_TTL);
    if (!ok) throw new AppError('SPIN_IN_PROGRESS', 'Another request is being processed', 409);
    try {
      return await fn();
    } finally {
      await this.cache.delIfEquals(key, token);
    }
  }

  private async getOrCreateSession(userId: string): Promise<SessionRecord> {
    const cached = await this.cache.get(`session:${userId}`);
    if (cached) return JSON.parse(cached) as SessionRecord;
    let s = await this.store.sessions.getByUser(userId);
    if (!s) {
      s = { id: randomUUID(), userId, sequence: 0, freeSpins: null, pendingBonusRoundId: null, lastRoundId: null, updatedAt: new Date() };
      await this.store.sessions.save(s);
    }
    await this.cache.set(`session:${userId}`, JSON.stringify(s), 60 * 60 * 1000);
    return s;
  }

  private async saveSession(s: SessionRecord) {
    s.updatedAt = new Date();
    await this.store.sessions.save(s);
    await this.cache.set(`session:${s.userId}`, JSON.stringify(s), 60 * 60 * 1000);
  }

  /** Records a ledger transaction and applies the balance change exactly once. */
  private async applyTx(userId: string, roundId: string, type: TransactionType, amount: number): Promise<number> {
    const key = `${roundId}:${type}`;
    const existing = await this.store.transactions.findByKey(key);
    if (existing) return existing.balanceAfter;
    const balanceAfter = await this.store.users.adjustBalance(userId, amount);
    if (balanceAfter === null) throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance', 402);
    try {
      await this.store.transactions.insert({ id: randomUUID(), key, userId, roundId, type, amount, balanceAfter, createdAt: new Date() });
    } catch (e) {
      if (e instanceof DuplicateKeyError) {
        // lost a race: undo our balance change and return the recorded result
        await this.store.users.adjustBalance(userId, -amount);
        return (await this.store.transactions.findByKey(key))!.balanceAfter;
      }
      throw e;
    }
    return balanceAfter;
  }

  /** Completes rounds that were persisted but not fully settled (crash recovery). */
  async recoverUnsettled(userId: string): Promise<number> {
    const pending = await this.store.rounds.findByStatus(userId, 'SETTLING');
    for (const r of pending) {
      let balance = r.balanceAfter;
      if (r.outcome.totalWin > 0) balance = await this.applyTx(userId, r.id, 'WIN', r.outcome.totalWin);
      const status = r.outcome.bossFight && r.bonusPicks.length < this.config.bossFight.shots ? 'BONUS_PENDING' : 'COMPLETED';
      await this.store.rounds.update(r.id, { status, balanceAfter: balance });
    }
    return pending.length;
  }

  private toResponse(round: RoundRecord): SpinResponse {
    const { bossFight: _hidden, ...rest } = round.outcome;
    void _hidden;
    const outcome: PublicOutcome = { ...rest, bossFight: null };
    return {
      roundId: round.id,
      sequence: round.sequence,
      outcome,
      balanceBefore: round.balanceBefore,
      balanceAfter: round.balanceAfter,
      bossFight: publicBossFightFor(this.config, round),
      freeSpins: toPublicFreeSpins(nextFreeSpinsState(round.outcome)),
      createdAt: new Date(round.createdAt).toISOString(),
    };
  }

  async getSessionState(userId: string): Promise<SessionState> {
    await this.recoverUnsettled(userId);
    const user = await this.store.users.get(userId);
    if (!user) throw new AppError('UNAUTHORIZED', 'Unknown user', 401);
    const session = await this.getOrCreateSession(userId);
    const bonusRound = session.pendingBonusRoundId ? await this.store.rounds.get(session.pendingBonusRoundId) : null;
    const lastRound = session.lastRoundId ? await this.store.rounds.get(session.lastRoundId) : null;
    return {
      sessionId: session.id,
      userId,
      nickname: user.nickname,
      balance: user.balance,
      sequence: session.sequence,
      freeSpins: toPublicFreeSpins(session.freeSpins),
      bossFight: bonusRound ? publicBossFightFor(this.config, bonusRound) : null,
      lastRound: lastRound ? this.toResponse(lastRound) : null,
    };
  }

  async getBalance(userId: string): Promise<number> {
    const u = await this.store.users.get(userId);
    if (!u) throw new AppError('UNAUTHORIZED', 'Unknown user', 401);
    return u.balance;
  }

  async spin(userId: string, req: SpinRequest): Promise<SpinResponse> {
    const idemKey = `idem:spin:${userId}:${req.idempotencyKey}`;
    const cached = await this.cache.get(idemKey);
    if (cached) return JSON.parse(cached) as SpinResponse;

    const res = await this.withUserLock(userId, async () => {
      // persistent idempotency check (survives cache loss)
      const prior = await this.store.rounds.findByIdempotency(userId, req.idempotencyKey);
      if (prior) return this.toResponse(prior);

      await this.recoverUnsettled(userId);
      const session = await this.getOrCreateSession(userId);
      if (session.pendingBonusRoundId) throw new AppError('BONUS_PENDING', 'Finish the boss fight first', 409);

      const fs = session.freeSpins && session.freeSpins.remaining > 0 ? session.freeSpins : null;
      const bet = fs ? fs.bet : req.bet;
      if (!fs && !isValidBet(this.config, bet)) throw new AppError('INVALID_BET', 'Bet is not an allowed level', 400);

      const roundId = randomUUID();
      const sequence = session.sequence + 1;
      const balanceBefore = await this.getBalance(userId);

      // 1. debit (atomic, conditional on funds) – free spins cost nothing
      let balance = balanceBefore;
      if (!fs) balance = await this.applyTx(userId, roundId, 'BET', -bet);

      // 2. generate the full outcome server side
      let outcome: RoundOutcome;
      try {
        outcome = this.engine.play(bet, fs);
      } catch (e) {
        if (!fs) await this.applyTx(userId, roundId, 'WIN', bet); // refund
        throw e;
      }

      // 3. persist the full round before anything is communicated
      const round: RoundRecord = {
        id: roundId,
        userId,
        sessionId: session.id,
        sequence,
        idempotencyKey: req.idempotencyKey,
        mode: outcome.mode,
        bet,
        outcome,
        status: 'SETTLING',
        bonusPicks: [],
        balanceBefore,
        balanceAfter: balance,
        createdAt: new Date(),
      };
      await this.store.rounds.insert(round);

      // 4. credit the win
      if (outcome.totalWin > 0) balance = await this.applyTx(userId, roundId, 'WIN', outcome.totalWin);
      round.balanceAfter = balance;
      round.status = outcome.bossFight ? 'BONUS_PENDING' : 'COMPLETED';
      await this.store.rounds.update(roundId, { status: round.status, balanceAfter: balance });

      // 5. session state transitions
      session.sequence = sequence;
      session.lastRoundId = roundId;
      session.freeSpins = nextFreeSpinsState(outcome);
      if (outcome.bossFight) session.pendingBonusRoundId = roundId;
      await this.saveSession(session);

      await this.store.history.insert({
        roundId,
        userId,
        sequence,
        mode: outcome.mode,
        bet,
        win: outcome.totalWin,
        bonusWin: 0,
        winTier: outcome.winTier,
        balanceAfter: balance,
        finalGrid: outcome.finalGrid,
        createdAt: round.createdAt,
      });
      return this.toResponse(round);
    });

    await this.cache.set(idemKey, JSON.stringify(res), IDEMPOTENCY_TTL);
    this.events.onSpin?.(userId, res);
    return res;
  }

  async bonusPick(userId: string, req: BonusPickRequest): Promise<BonusPickResponse> {
    const idemKey = `idem:bonus:${userId}:${req.idempotencyKey}`;
    const cached = await this.cache.get(idemKey);
    if (cached) return JSON.parse(cached) as BonusPickResponse;

    const res = await this.withUserLock(userId, async () => {
      const round = await this.store.rounds.get(req.roundId);
      if (!round || round.userId !== userId) throw new AppError('NOT_FOUND', 'Round not found', 404);
      if (round.status !== 'BONUS_PENDING' || !round.outcome.bossFight) throw new AppError('NO_BONUS', 'No boss fight pending', 409);
      const cfg = this.config.bossFight;
      if (req.targetIndex >= cfg.targets) throw new AppError('VALIDATION', 'Invalid target', 400);

      // The reward for shot N was fixed when the round was generated; picking only reveals it.
      round.bonusPicks = [...round.bonusPicks, req.targetIndex];
      const completed = round.bonusPicks.length >= cfg.shots;
      let balance = round.balanceAfter;
      await this.store.rounds.update(round.id, { bonusPicks: round.bonusPicks });
      if (completed) {
        balance = await this.applyTx(userId, round.id, 'BONUS_WIN', round.outcome.bossFight.totalWin);
        await this.store.rounds.update(round.id, { status: 'COMPLETED' });
        await this.store.history.update(round.id, { bonusWin: round.outcome.bossFight.totalWin, balanceAfter: balance });
        const session = await this.getOrCreateSession(userId);
        session.pendingBonusRoundId = null;
        await this.saveSession(session);
      } else {
        balance = await this.getBalance(userId);
      }
      const bossFight = publicBossFightFor(this.config, round)!;
      return { bossFight, pick: bossFight.picks[bossFight.picks.length - 1], balanceAfter: balance };
    });

    await this.cache.set(idemKey, JSON.stringify(res), IDEMPOTENCY_TTL);
    this.events.onBonusPick?.(userId, res);
    return res;
  }

  async history(userId: string, limit = 50): Promise<HistoryEntry[]> {
    const list = await this.store.history.list(userId, Math.min(200, Math.max(1, limit)));
    return list.map(({ userId: _u, ...h }) => ({ ...h, createdAt: new Date(h.createdAt).toISOString() }));
  }
}
