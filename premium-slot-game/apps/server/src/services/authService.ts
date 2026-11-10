import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { Store, UserRecord } from '../store/types';
import { AppError } from './errors';

export interface AuthService {
  createDemoUser(nickname?: string): Promise<{ token: string; user: UserRecord }>;
  verify(token: string | undefined): Promise<UserRecord>;
}

export function createAuthService(store: Store, secret: string, initialBalance: number): AuthService {
  return {
    async createDemoUser(nickname) {
      const user: UserRecord = {
        id: randomUUID(),
        nickname: nickname || `Runner-${Math.floor(1000 + Math.random() * 9000)}`,
        balance: initialBalance,
        createdAt: new Date(),
      };
      await store.users.create(user);
      const token = jwt.sign({ sub: user.id, demo: true }, secret, { expiresIn: '7d' });
      return { token, user };
    },
    async verify(token) {
      if (!token) throw new AppError('UNAUTHORIZED', 'Missing token', 401);
      let sub: string;
      try {
        const payload = jwt.verify(token, secret) as jwt.JwtPayload;
        sub = String(payload.sub);
      } catch {
        throw new AppError('UNAUTHORIZED', 'Invalid token', 401);
      }
      const user = await store.users.get(sub);
      if (!user) throw new AppError('UNAUTHORIZED', 'Unknown user', 401);
      return user;
    },
  };
}
