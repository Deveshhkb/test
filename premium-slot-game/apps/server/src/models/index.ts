import mongoose, { Schema } from 'mongoose';

const opts = { versionKey: false as const };

export const UserModel = mongoose.model(
  'User',
  new Schema(
    {
      _id: { type: String },
      nickname: { type: String, required: true },
      balance: { type: Number, required: true, min: 0 },
      createdAt: { type: Date, required: true },
    },
    opts,
  ),
  'users',
);

export const GameSessionModel = mongoose.model(
  'GameSession',
  new Schema(
    {
      _id: { type: String },
      userId: { type: String, required: true, unique: true },
      sequence: { type: Number, required: true },
      freeSpins: { type: Schema.Types.Mixed, default: null },
      pendingBonusRoundId: { type: String, default: null },
      lastRoundId: { type: String, default: null },
      updatedAt: { type: Date, required: true },
    },
    opts,
  ),
  'gamesessions',
);

const roundSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    sequence: { type: Number, required: true },
    idempotencyKey: { type: String, required: true },
    mode: { type: String, required: true },
    bet: { type: Number, required: true },
    outcome: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true, index: true },
    bonusPicks: { type: [Number], default: [] },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  opts,
);
roundSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
roundSchema.index({ userId: 1, sequence: 1 }, { unique: true });
export const GameRoundModel = mongoose.model('GameRound', roundSchema, 'gamerounds');

export const TransactionModel = mongoose.model(
  'Transaction',
  new Schema(
    {
      _id: { type: String },
      key: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      roundId: { type: String, required: true },
      type: { type: String, required: true },
      amount: { type: Number, required: true },
      balanceAfter: { type: Number, required: true },
      createdAt: { type: Date, required: true },
    },
    opts,
  ),
  'transactions',
);

const historySchema = new Schema(
  {
    roundId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    sequence: { type: Number, required: true },
    mode: String,
    bet: Number,
    win: Number,
    bonusWin: Number,
    winTier: String,
    balanceAfter: Number,
    finalGrid: Schema.Types.Mixed,
    createdAt: Date,
  },
  opts,
);
historySchema.index({ userId: 1, sequence: -1 });
export const GameHistoryModel = mongoose.model('GameHistory', historySchema, 'gamehistory');
