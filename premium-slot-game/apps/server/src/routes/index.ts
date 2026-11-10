import { Router, type NextFunction, type Request, type Response } from 'express';
import type { GameConfig } from '@neon/game-math';
import { authController } from '../controllers/authController';
import { gameController } from '../controllers/gameController';
import { requireAuth } from '../middleware/auth';
import type { AuthService } from '../services/authService';
import type { GameService } from '../services/gameService';

type Handler = (req: Request, res: Response) => unknown;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

export function buildRoutes(deps: { auth: AuthService; game: GameService; config: GameConfig; health: () => object }) {
  const r = Router();
  const a = authController(deps.auth);
  const g = gameController(deps.game, deps.config);
  const guard = requireAuth(deps.auth);

  r.get('/health', (_req, res) => res.json({ status: 'ok', ...deps.health() }));
  r.post('/auth/demo', wrap(a.demo));
  r.get('/game/paytable', wrap(g.paytable));
  r.get('/game/config', wrap(g.config));
  r.post('/game/session', guard, wrap(g.session));
  r.post('/game/spin', guard, wrap(g.spin));
  r.post('/game/bonus/pick', guard, wrap(g.bonusPick));
  r.get('/game/balance', guard, wrap(g.balance));
  r.get('/game/history', guard, wrap(g.history));
  return r;
}
