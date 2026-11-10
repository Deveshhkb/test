import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../services/authService';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(auth: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      const user = await auth.verify(token);
      req.userId = user.id;
      next();
    } catch (e) {
      next(e);
    }
  };
}
