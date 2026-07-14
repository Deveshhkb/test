import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      Object.assign(req[source] as object, parsed);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const detail = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(ApiError.badRequest(detail, 'VALIDATION_ERROR'));
      }
      next(err);
    }
  };
