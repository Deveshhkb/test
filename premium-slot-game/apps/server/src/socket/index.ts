import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { ZodError } from 'zod';
import { BonusPickSchema, SocketEvents, SpinRequestSchema, type Ack, type BonusPickResponse, type SpinResponse } from '@neon/shared';
import type { AuthService } from '../services/authService';
import type { Cache } from '../services/cache';
import { AppError } from '../services/errors';
import type { GameService } from '../services/gameService';

function toError(e: unknown) {
  if (e instanceof AppError) return { code: e.code, message: e.message };
  if (e instanceof ZodError) return { code: 'VALIDATION' as const, message: e.issues.map((i) => i.message).join('; ') };
  console.error(e);
  return { code: 'INTERNAL' as const, message: 'Internal server error' };
}

const room = (userId: string) => `user:${userId}`;

export function attachSocket(http: HttpServer, deps: { auth: AuthService; game: GameService; cache: Cache; corsOrigin: string }) {
  const io = new Server(http, { cors: { origin: deps.corsOrigin }, connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 } });

  io.use(async (socket, next) => {
    try {
      const user = await deps.auth.verify(socket.handshake.auth?.token as string | undefined);
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(room(userId));
    await deps.cache.set(`presence:${userId}:${socket.id}`, String(Date.now()), 6 * 60 * 60 * 1000);

    const handleJoin = async (_payload: unknown, ack?: Ack<unknown>) => {
      try {
        const state = await deps.game.getSessionState(userId);
        socket.emit(SocketEvents.STATE, state);
        ack?.({ ok: true, data: state });
      } catch (e) {
        ack?.({ ok: false, error: toError(e) });
      }
    };
    socket.on(SocketEvents.JOIN, handleJoin);
    socket.on(SocketEvents.RESUME, handleJoin);

    socket.on(SocketEvents.SPIN, async (payload: unknown, ack?: Ack<SpinResponse>) => {
      try {
        const req = SpinRequestSchema.parse(payload);
        socket.emit(SocketEvents.SPIN_ACCEPTED, { idempotencyKey: req.idempotencyKey });
        const res = await deps.game.spin(userId, req);
        ack?.({ ok: true, data: res });
      } catch (e) {
        const error = toError(e);
        socket.emit(SocketEvents.ERROR, error);
        ack?.({ ok: false, error });
      }
    });

    socket.on(SocketEvents.BONUS_PICK, async (payload: unknown, ack?: Ack<BonusPickResponse>) => {
      try {
        const res = await deps.game.bonusPick(userId, BonusPickSchema.parse(payload));
        ack?.({ ok: true, data: res });
      } catch (e) {
        const error = toError(e);
        socket.emit(SocketEvents.ERROR, error);
        ack?.({ ok: false, error });
      }
    });

    socket.on('disconnect', () => {
      void deps.cache.del(`presence:${userId}:${socket.id}`);
    });
  });

  /** Fan out authoritative results to every connected tab of the user. */
  const notifySpin = (userId: string, res: SpinResponse) => {
    const r = io.to(room(userId));
    r.emit(SocketEvents.REELS, { roundId: res.roundId, sequence: res.sequence, initialGrid: res.outcome.initialGrid });
    r.emit(SocketEvents.CASCADE, { roundId: res.roundId, steps: res.outcome.cascades.length });
    if (res.outcome.totalWin > 0) r.emit(SocketEvents.WIN, { roundId: res.roundId, win: res.outcome.totalWin, tier: res.outcome.winTier });
    if (res.freeSpins || res.outcome.freeSpins) r.emit(SocketEvents.FREE_SPINS, res.outcome.freeSpins);
    if (res.bossFight) r.emit(SocketEvents.BONUS, res.bossFight);
    r.emit(SocketEvents.BALANCE, { balance: res.balanceAfter, sequence: res.sequence });
  };
  const notifyBonus = (userId: string, res: BonusPickResponse) => {
    io.to(room(userId)).emit(SocketEvents.BONUS, res.bossFight);
    io.to(room(userId)).emit(SocketEvents.BALANCE, { balance: res.balanceAfter });
  };
  return { io, notifySpin, notifyBonus };
}
