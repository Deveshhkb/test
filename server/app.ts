import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { SlotEngine } from '@/services/SlotEngine';
import type { GameSettings } from '@/types';

/**
 * Real RGS backend. One SlotEngine per player session — the identical
 * engine the in-browser mock uses, so client behaviour is unchanged when
 * switching transports. Sessions are identified by an `x-session-id`
 * header issued at login and expire after 30 minutes of inactivity.
 */

const SESSION_TTL_MS = 30 * 60 * 1000;

interface Session {
  engine: SlotEngine;
  settings: GameSettings | null;
  lastSeen: number;
}

export function createApp() {
  const app = express();
  const sessions = new Map<string, Session>();

  app.use(cors({ exposedHeaders: ['x-session-id'] }));
  app.use(express.json());

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastSeen > SESSION_TTL_MS) sessions.delete(id);
    }
  }, 60_000);
  sweep.unref?.();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, sessions: sessions.size });
  });

  app.post('/api/login', async (_req, res) => {
    const sessionId = crypto.randomUUID();
    const engine = new SlotEngine();
    sessions.set(sessionId, { engine, settings: null, lastSeen: Date.now() });
    const login = await engine.login();
    res.json({ ...login, playerId: sessionId.slice(0, 8), sessionId });
  });

  /** Everything below requires a valid session. */
  const withSession = (
    handler: (session: Session, req: Request, res: Response) => Promise<void>,
  ) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const id = req.header('x-session-id');
      const session = id ? sessions.get(id) : undefined;
      if (!session) {
        res.status(401).json({ error: 'NO_SESSION' });
        return;
      }
      session.lastSeen = Date.now();
      handler(session, req, res).catch(next);
    };
  };

  app.post(
    '/api/spin',
    withSession(async (session, req, res) => {
      const bet = Number(req.body?.bet);
      if (!Number.isFinite(bet)) {
        res.status(400).json({ error: 'INVALID_BET' });
        return;
      }
      try {
        res.json(await session.engine.spin(bet));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SPIN_FAILED';
        if (message === 'INSUFFICIENT_FUNDS' || message === 'INVALID_BET') {
          res.status(400).json({ error: message });
          return;
        }
        throw error;
      }
    }),
  );

  app.post(
    '/api/bonus',
    withSession(async (session, req, res) => {
      const pickedIndex = Number(req.body?.pickedIndex ?? 0);
      res.json(await session.engine.bonus(pickedIndex));
    }),
  );

  app.post(
    '/api/collect',
    withSession(async (session, _req, res) => {
      res.json(await session.engine.collect());
    }),
  );

  app.get(
    '/api/history',
    withSession(async (session, _req, res) => {
      res.json(await session.engine.getHistory());
    }),
  );

  app.post(
    '/api/settings',
    withSession(async (session, req, res) => {
      session.settings = req.body as GameSettings;
      res.json(session.settings);
    }),
  );

  // Central error handler — never leak stack traces to the client.
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[rgs]', error);
    res.status(500).json({ error: 'INTERNAL' });
  });

  return app;
}
