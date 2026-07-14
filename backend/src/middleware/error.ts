import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err instanceof ApiError ? err.statusCode : 500;
  const message = status === 500 && env.isProd ? 'Something went wrong' : err.message;
  if (status === 500) console.error('[error]', err);
  res.status(status).json({
    success: false,
    message,
    code: err instanceof ApiError ? err.code : undefined,
  });
};
