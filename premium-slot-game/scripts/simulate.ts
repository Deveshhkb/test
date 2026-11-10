/**
 * Monte-Carlo simulation of NEON BREAK math. Usage: npm run simulate -- [rounds] [seed]
 * Plays base rounds; free spin sequences and boss fights are played to completion and
 * attributed to the triggering base round (standard RTP accounting).
 */
import { DEFAULT_CONFIG, SeededRng, playRound, type FreeSpinsState } from '@neon/game-math';

const rounds = Number(process.argv[2] ?? 200000);
const rng = new SeededRng(Number(process.argv[3] ?? 12345));
const config = DEFAULT_CONFIG;
const bet = 10000;

let wagered = 0, baseWin = 0, fsWin = 0, bossWin = 0, hits = 0, fsTriggers = 0, bossTriggers = 0, lucky = 0, maxX = 0;
const tiers: Record<string, number> = {};
for (let i = 0; i < rounds; i++) {
  wagered += bet;
  const r = playRound({ config, rng, bet });
  let roundWin = r.totalWin;
  baseWin += r.totalWin;
  if (r.totalWin > 0) hits++;
  if (r.lucky) lucky++;
  tiers[r.winTier] = (tiers[r.winTier] ?? 0) + 1;
  if (r.bossFight) { bossTriggers++; bossWin += r.bossFight.totalWin; roundWin += r.bossFight.totalWin; }
  if (r.freeSpins?.triggered) {
    fsTriggers++;
    let fs: FreeSpinsState = r.freeSpins;
    let guard = 0;
    while (fs.remaining > 0 && guard++ < 500) {
      const f = playRound({ config, rng, bet, freeSpins: fs });
      fsWin += f.totalWin;
      roundWin += f.totalWin;
      fs = f.freeSpins!;
    }
  }
  maxX = Math.max(maxX, roundWin / bet);
}
const pct = (x: number) => ((x / wagered) * 100).toFixed(2) + '%';
console.log({
  rounds,
  rtp: pct(baseWin + fsWin + bossWin),
  baseRtp: pct(baseWin),
  freeSpinsRtp: pct(fsWin),
  bossRtp: pct(bossWin),
  hitFrequency: ((hits / rounds) * 100).toFixed(2) + '%',
  freeSpinsEvery: Math.round(rounds / Math.max(1, fsTriggers)),
  bossEvery: Math.round(rounds / Math.max(1, bossTriggers)),
  luckyRate: ((lucky / rounds) * 100).toFixed(2) + '%',
  tiers,
  maxWinX: maxX.toFixed(1),
});
