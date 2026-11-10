import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { GameConfig, Rng } from '@neon/game-math';
import { RoundEngine } from './game/engine/roundEngine';
import { errorHandler } from './middleware/errorHandler';
import { buildRoutes } from './routes';
import { createAuthService } from './services/authService';
import type { Cache } from './services/cache';
import { GameService, type GameEvents } from './services/gameService';
import { CryptoRng } from './services/rng';
import type { Store } from './store/types';

export interface AppDeps {
  store: Store;
  cache: Cache;
  config: GameConfig;
  jwtSecret: string;
  initialBalance: number;
  rng?: Rng;
  corsOrigin?: string;
  clientDist?: string | null;
  events?: GameEvents;
}

export function createApp(deps: AppDeps) {
  const auth = createAuthService(deps.store, deps.jwtSecret, deps.initialBalance);
  const events: GameEvents = deps.events ?? {};
  const game = new GameService(deps.store, deps.cache, new RoundEngine(deps.config, deps.rng ?? new CryptoRng()), deps.config, events);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: deps.corsOrigin ?? '*' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(
    '/api',
    buildRoutes({ auth, game, config: deps.config, health: () => ({ store: deps.store.kind, cache: deps.cache.kind, time: new Date().toISOString() }) }),
  );

  if (deps.clientDist && existsSync(deps.clientDist)) {
    app.use(express.static(deps.clientDist, { maxAge: '1h', index: false }));
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(deps.clientDist!, 'index.html')));
  }
  app.use(errorHandler);
  return { app, auth, game, events };
}
