import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../middleware/auth';
import { Driver } from '../models/Driver';

let io: Server | null = null;

/**
 * Rooms:
 *  - `order:<orderId>`  — customer + driver + admin watch one order
 *  - `driver:<userId>`  — direct messages to a driver (new order offers)
 *  - `admin`            — live order board in the admin panel
 */
export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };

    if (role === 'driver') socket.join(`driver:${userId}`);
    if (role === 'admin') socket.join('admin');

    socket.on('order:watch', (orderId: string) => socket.join(`order:${orderId}`));
    socket.on('order:unwatch', (orderId: string) => socket.leave(`order:${orderId}`));

    // Driver publishes live GPS; fan out to everyone watching that order.
    socket.on(
      'driver:location',
      async (data: { orderId?: string; lat: number; lng: number }) => {
        if (role !== 'driver') return;
        if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return;
        await Driver.updateOne(
          { user: userId },
          { currentLocation: { type: 'Point', coordinates: [data.lng, data.lat] } },
        ).catch(() => undefined);
        if (data.orderId) {
          socket.to(`order:${data.orderId}`).emit('driver:location', {
            orderId: data.orderId,
            lat: data.lat,
            lng: data.lng,
            at: Date.now(),
          });
        }
      },
    );
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
};

export const emitOrderUpdate = (orderId: string, payload: unknown): void => {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:update', payload);
  io.to('admin').emit('order:update', payload);
};

export const offerOrderToDriver = (driverUserId: string, payload: unknown): void => {
  io?.to(`driver:${driverUserId}`).emit('order:offer', payload);
};
