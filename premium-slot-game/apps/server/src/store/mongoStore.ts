import mongoose from 'mongoose';
import { GameHistoryModel, GameRoundModel, GameSessionModel, TransactionModel, UserModel } from '../models';
import { DuplicateKeyError, type Store } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromDoc = <T>(doc: any): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return (rest.id ? rest : { id: _id, ...rest }) as T;
};
const isDup = (e: unknown) => (e as { code?: number })?.code === 11000;

/** MongoDB-backed persistent store. Balance changes use single-document atomic updates. */
export async function createMongoStore(uri: string): Promise<Store> {
  await mongoose.connect(uri);
  await Promise.all([UserModel, GameSessionModel, GameRoundModel, TransactionModel, GameHistoryModel].map((m) => m.syncIndexes()));

  return {
    kind: 'mongo',
    users: {
      async create(u) {
        await UserModel.create({ _id: u.id, nickname: u.nickname, balance: u.balance, createdAt: u.createdAt });
        return u;
      },
      async get(id) {
        return fromDoc(await UserModel.findById(id).lean());
      },
      async adjustBalance(id, delta) {
        const filter: Record<string, unknown> = { _id: id };
        if (delta < 0) filter.balance = { $gte: -delta };
        const doc = await UserModel.findOneAndUpdate(filter, { $inc: { balance: delta } }, { new: true }).lean();
        return doc ? (doc as any).balance : null;
      },
    },
    sessions: {
      async getByUser(userId) {
        return fromDoc(await GameSessionModel.findOne({ userId }).lean());
      },
      async save(s) {
        const { id, ...rest } = s;
        await GameSessionModel.updateOne({ _id: id }, { $set: rest }, { upsert: true });
      },
    },
    rounds: {
      async insert(r) {
        const { id, ...rest } = r;
        try {
          await GameRoundModel.create({ _id: id, ...rest });
        } catch (e) {
          if (isDup(e)) throw new DuplicateKeyError(r.idempotencyKey);
          throw e;
        }
      },
      async update(id, patch) {
        await GameRoundModel.updateOne({ _id: id }, { $set: patch });
      },
      async get(id) {
        return fromDoc(await GameRoundModel.findById(id).lean());
      },
      async findByIdempotency(userId, key) {
        return fromDoc(await GameRoundModel.findOne({ userId, idempotencyKey: key }).lean());
      },
      async findByStatus(userId, status) {
        const docs = await GameRoundModel.find({ userId, status }).lean();
        return docs.map((d) => fromDoc(d)!) as any;
      },
    },
    transactions: {
      async insert(tx) {
        const { id, ...rest } = tx;
        try {
          await TransactionModel.create({ _id: id, ...rest });
        } catch (e) {
          if (isDup(e)) throw new DuplicateKeyError(tx.key);
          throw e;
        }
      },
      async findByKey(key) {
        return fromDoc(await TransactionModel.findOne({ key }).lean());
      },
      async listByUser(userId) {
        const docs = await TransactionModel.find({ userId }).sort({ createdAt: 1 }).lean();
        return docs.map((d) => fromDoc(d)!) as any;
      },
    },
    history: {
      async insert(e) {
        await GameHistoryModel.create(e);
      },
      async update(roundId, patch) {
        await GameHistoryModel.updateOne({ roundId }, { $set: patch });
      },
      async list(userId, limit) {
        const docs = await GameHistoryModel.find({ userId }).sort({ sequence: -1 }).limit(limit).lean();
        return docs.map(({ _id, ...rest }: any) => rest);
      },
    },
    async close() {
      await mongoose.disconnect();
    },
  };
}
