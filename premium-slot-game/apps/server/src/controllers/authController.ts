import type { Request, Response } from 'express';
import { DemoAuthSchema } from '@neon/shared';
import type { AuthService } from '../services/authService';

export const authController = (auth: AuthService) => ({
  demo: async (req: Request, res: Response) => {
    const body = DemoAuthSchema.parse(req.body ?? {});
    const { token, user } = await auth.createDemoUser(body.nickname);
    res.status(201).json({ token, user: { id: user.id, nickname: user.nickname, balance: user.balance } });
  },
});
