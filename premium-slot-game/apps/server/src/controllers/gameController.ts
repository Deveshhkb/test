import type { Request, Response } from 'express';
import { BonusPickSchema, SpinRequestSchema, type PublicConfig } from '@neon/shared';
import { theoreticalMaxWays, type GameConfig } from '@neon/game-math';
import type { GameService } from '../services/gameService';

export const gameController = (game: GameService, config: GameConfig) => ({
  session: async (req: Request, res: Response) => {
    res.json(await game.getSessionState(req.userId!));
  },
  spin: async (req: Request, res: Response) => {
    const body = SpinRequestSchema.parse(req.body);
    res.json(await game.spin(req.userId!, body));
  },
  bonusPick: async (req: Request, res: Response) => {
    const body = BonusPickSchema.parse(req.body);
    res.json(await game.bonusPick(req.userId!, body));
  },
  balance: async (req: Request, res: Response) => {
    res.json({ balance: await game.getBalance(req.userId!) });
  },
  history: async (req: Request, res: Response) => {
    res.json({ rounds: await game.history(req.userId!, Number(req.query.limit ?? 50)) });
  },
  paytable: (_req: Request, res: Response) => {
    res.json({
      symbols: config.symbols,
      scatterPays: config.scatterPays,
      freeSpins: config.freeSpins,
      bossFight: { triggerCount: config.bossFight.triggerCount, shots: config.bossFight.shots, tiers: config.bossFight.rewards.map((r) => r.multiplier) },
      minWaysLength: config.minWaysLength,
      maxWays: theoreticalMaxWays(config),
    });
  },
  config: (_req: Request, res: Response) => {
    const body: PublicConfig = { config, maxWays: theoreticalMaxWays(config), currency: 'CREDITS' };
    res.json(body);
  },
});
