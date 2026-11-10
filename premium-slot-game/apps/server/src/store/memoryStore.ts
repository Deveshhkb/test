import {
  DuplicateKeyError,
  type HistoryRecord,
  type RoundRecord,
  type SessionRecord,
  type Store,
  type TransactionRecord,
  type UserRecord,
} from './types';

const clone = <T>(v: T): T => structuredClone(v);

/** In-process store used for local demo play and tests (single node only). */
export function createMemoryStore(): Store {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, SessionRecord>();
  const rounds = new Map<string, RoundRecord>();
  const txs = new Map<string, TransactionRecord>();
  const history: HistoryRecord[] = [];

  return {
    kind: 'memory',
    users: {
      async create(u) {
        users.set(u.id, clone(u));
        return clone(u);
      },
      async get(id) {
        const u = users.get(id);
        return u ? clone(u) : null;
      },
      async adjustBalance(id, delta) {
        const u = users.get(id);
        if (!u) return null;
        const next = u.balance + delta;
        if (next < 0) return null;
        u.balance = next;
        return next;
      },
    },
    sessions: {
      async getByUser(userId) {
        const s = sessions.get(userId);
        return s ? clone(s) : null;
      },
      async save(s) {
        sessions.set(s.userId, clone(s));
      },
    },
    rounds: {
      async insert(r) {
        if (rounds.has(r.id)) throw new DuplicateKeyError(r.id);
        for (const x of rounds.values())
          if (x.userId === r.userId && x.idempotencyKey === r.idempotencyKey) throw new DuplicateKeyError(r.idempotencyKey);
        rounds.set(r.id, clone(r));
      },
      async update(id, patch) {
        const r = rounds.get(id);
        if (r) Object.assign(r, clone(patch));
      },
      async get(id) {
        const r = rounds.get(id);
        return r ? clone(r) : null;
      },
      async findByIdempotency(userId, key) {
        for (const r of rounds.values()) if (r.userId === userId && r.idempotencyKey === key) return clone(r);
        return null;
      },
      async findByStatus(userId, status) {
        return [...rounds.values()].filter((r) => r.userId === userId && r.status === status).map(clone);
      },
    },
    transactions: {
      async insert(tx) {
        if (txs.has(tx.key)) throw new DuplicateKeyError(tx.key);
        txs.set(tx.key, clone(tx));
      },
      async findByKey(key) {
        const t = txs.get(key);
        return t ? clone(t) : null;
      },
      async listByUser(userId) {
        return [...txs.values()].filter((t) => t.userId === userId).map(clone);
      },
    },
    history: {
      async insert(e) {
        history.push(clone(e));
      },
      async update(roundId, patch) {
        const e = history.find((h) => h.roundId === roundId);
        if (e) Object.assign(e, clone(patch));
      },
      async list(userId, limit) {
        return history
          .filter((h) => h.userId === userId)
          .sort((a, b) => b.sequence - a.sequence)
          .slice(0, limit)
          .map(clone);
      },
    },
    async close() {},
  };
}
