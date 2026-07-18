import type {
  BonusResult,
  Cell,
  CascadeStep,
  GameSettings,
  Grid,
  HistoryEntry,
  LoginResult,
  SpinFeatures,
  SpinResult,
  SymbolId,
} from '@/types';
import {
  FEATURE_CONFIG,
  MYSTERY_POOL,
  RTP_CONFIG,
  getReelStrips,
} from '@/config/gameConfig';
import {
  cascadeGrid,
  countSymbol,
  evaluatePaylines,
  evaluateScatter,
  findSymbol,
  roundCredits,
  totalWinOf,
  winningCells,
} from '@/utils/paylineEngine';
import { chance, randomInt, randomPick } from '@/utils/rng';
import { DEFAULT_BALANCE, HISTORY_LIMIT, REEL_COUNT, ROW_COUNT } from '@/constants';

/**
 * The slot game engine — the single source of truth for balance, RNG,
 * feature state and win evaluation. Two hosts share it: the in-browser
 * mock (src/api/mockServer.ts) and the real Node backend (server/app.ts),
 * so the math is identical wherever it runs. The client only animates what
 * this returns.
 */
export class SlotEngine {
  private balance = DEFAULT_BALANCE;
  private strips = getReelStrips(RTP_CONFIG.volatility);
  private history: HistoryEntry[] = [];
  private nextHistoryId = 1;

  // Free-spins session state
  private freeSpinsRemaining = 0;
  private freeSpinBet = 0;
  private stickyWilds: Cell[] = [];

  // Pending bonus state
  private pendingBonusBet = 0;

  async login(): Promise<LoginResult> {
    return { playerId: 'demo-player', balance: this.balance, currency: 'USD' };
  }

  /** Restore a fresh session (demo restart / tests). */
  reset(): void {
    this.balance = DEFAULT_BALANCE;
    this.history = [];
    this.nextHistoryId = 1;
    this.freeSpinsRemaining = 0;
    this.freeSpinBet = 0;
    this.stickyWilds = [];
    this.pendingBonusBet = 0;
  }

  async spin(bet: number): Promise<SpinResult> {
    const isFreeSpin = this.freeSpinsRemaining > 0;
    const effectiveBet = isFreeSpin ? this.freeSpinBet : bet;

    if (!isFreeSpin) {
      if (bet <= 0) throw new Error('INVALID_BET');
      if (bet > this.balance) throw new Error('INSUFFICIENT_FUNDS');
      this.balance = roundCredits(this.balance - bet);
    } else {
      this.freeSpinsRemaining -= 1;
    }

    // --- Land the reels from the weighted virtual strips ---
    const landed = this.drawGrid();

    // --- Apply features to produce the evaluated grid ---
    const features: SpinFeatures = {
      expandedWildReels: [],
      stickyWilds: [],
      randomWilds: [],
      mysteryTransforms: [],
    };
    const grid: Grid = landed.map((col) => [...col]);

    // Mystery symbols transform before anything else.
    for (const position of findSymbol(grid, 'MYSTERY')) {
      const symbol = randomPick(MYSTERY_POOL);
      grid[position[0]][position[1]] = symbol;
      features.mysteryTransforms.push({ position, symbol });
    }

    // Sticky wilds from previous free spins are re-applied.
    if (isFreeSpin && FEATURE_CONFIG.stickyWildsInFreeSpins) {
      for (const [reel, row] of this.stickyWilds) {
        grid[reel][row] = 'WILD';
      }
      features.stickyWilds = [...this.stickyWilds];
    }

    // Random Wild Drop (base game only).
    if (!isFreeSpin && chance(FEATURE_CONFIG.randomWildChance)) {
      const drops = randomInt(FEATURE_CONFIG.randomWildMin, FEATURE_CONFIG.randomWildMax);
      for (let i = 0; i < drops; i++) {
        const reel = randomInt(0, REEL_COUNT - 1);
        const row = randomInt(0, ROW_COUNT - 1);
        if (grid[reel][row] !== 'WILD' && grid[reel][row] !== 'SCATTER') {
          grid[reel][row] = 'WILD';
          features.randomWilds.push([reel, row]);
        }
      }
    }

    // Expanding + sticky wilds during free spins. Only the wild cells that
    // actually LANDED stick for later spins — the expansion itself is
    // recomputed every spin (keeps the feature strong but not runaway).
    if (isFreeSpin) {
      const landedWildCells = findSymbol(grid, 'WILD');
      if (FEATURE_CONFIG.expandingWildsInFreeSpins) {
        for (let reel = 0; reel < REEL_COUNT; reel++) {
          if (grid[reel].includes('WILD')) {
            for (let row = 0; row < ROW_COUNT; row++) grid[reel][row] = 'WILD';
            features.expandedWildReels.push(reel);
          }
        }
      }
      if (FEATURE_CONFIG.stickyWildsInFreeSpins) {
        for (const [reel, row] of landedWildCells) {
          if (!this.stickyWilds.some(([r, w]) => r === reel && w === row)) {
            this.stickyWilds.push([reel, row]);
          }
        }
        features.stickyWilds = [...this.stickyWilds];
      }
    }

    // --- Evaluate ---
    const multiplier = isFreeSpin ? FEATURE_CONFIG.freeSpinMultiplier : 1;
    const scatterWin = evaluateScatter(grid, effectiveBet);
    let paylines = evaluatePaylines(grid, effectiveBet, multiplier);
    if (scatterWin) paylines = [...paylines, scatterWin];
    let totalWin = totalWinOf(paylines);

    // --- Cascading wins ---
    const cascades: CascadeStep[] = [];
    if (FEATURE_CONFIG.cascading && paylines.length > 0) {
      let currentGrid = grid;
      let currentWins = paylines.filter((w) => w.lineIndex >= 0);
      let step = 0;
      while (currentWins.length > 0 && step < FEATURE_CONFIG.maxCascades) {
        const removed = winningCells(currentWins);
        const nextGrid = cascadeGrid(currentGrid, removed, (reel) =>
          this.drawSymbol(reel, true),
        );
        step += 1;
        const cascadeMultiplier =
          FEATURE_CONFIG.cascadeMultipliers[
            Math.min(step, FEATURE_CONFIG.cascadeMultipliers.length - 1)
          ] * multiplier;
        const stepWins = evaluatePaylines(nextGrid, effectiveBet, cascadeMultiplier);
        const stepWin = totalWinOf(stepWins);
        cascades.push({
          reels: nextGrid,
          paylines: stepWins,
          stepWin,
          multiplier: cascadeMultiplier,
        });
        totalWin = roundCredits(totalWin + stepWin);
        currentGrid = nextGrid;
        currentWins = stepWins;
      }
    }

    // --- Scatter trigger / retrigger ---
    const scatter = countSymbol(grid, 'SCATTER');
    let freeSpinsAwarded = 0;
    if (scatter >= FEATURE_CONFIG.scatterTrigger) {
      if (isFreeSpin) {
        freeSpinsAwarded = FEATURE_CONFIG.freeSpinsRetriggerAwarded;
      } else {
        freeSpinsAwarded = FEATURE_CONFIG.freeSpinsAwarded;
        this.freeSpinBet = effectiveBet;
        this.stickyWilds = [];
      }
      this.freeSpinsRemaining += freeSpinsAwarded;
    }

    if (this.freeSpinsRemaining === 0) {
      this.stickyWilds = [];
      this.freeSpinBet = 0;
    }

    // --- Bonus trigger ---
    const bonusTriggered = countSymbol(grid, 'BONUS') >= FEATURE_CONFIG.bonusTrigger;
    if (bonusTriggered) this.pendingBonusBet = effectiveBet;

    this.balance = roundCredits(this.balance + totalWin);

    this.pushHistory({
      bet: effectiveBet,
      win: totalWin,
      isFreeSpin,
      scatter,
    });

    return {
      balance: this.balance,
      bet: effectiveBet,
      totalWin,
      reels: landed,
      finalReels: grid,
      paylines,
      cascades,
      scatter,
      freeSpins: freeSpinsAwarded,
      freeSpinsRemaining: this.freeSpinsRemaining,
      isFreeSpin,
      multiplier,
      bonusTriggered,
      features,
    };
  }

  /** Pick-a-prize bonus round. */
  async bonus(pickedIndex: number): Promise<BonusResult> {
    const bet = this.pendingBonusBet || this.freeSpinBet || 1;
    this.pendingBonusBet = 0;
    const options = [...FEATURE_CONFIG.bonusPrizes]
      .sort(() => (chance(0.5) ? 1 : -1))
      .slice(0, 3)
      .map((m) => roundCredits(m * bet));
    const index = Math.min(Math.max(pickedIndex, 0), options.length - 1);
    const prize = options[index];
    this.balance = roundCredits(this.balance + prize);
    return { balance: this.balance, prize, options, pickedIndex: index };
  }

  /** Collect simply acknowledges the win is banked (balance already updated). */
  async collect(): Promise<{ balance: number }> {
    return { balance: this.balance };
  }

  async getHistory(): Promise<HistoryEntry[]> {
    return [...this.history];
  }

  async saveSettings(settings: GameSettings): Promise<GameSettings> {
    return settings;
  }

  // ------------------------------------------------------------------

  private drawGrid(): Grid {
    const grid: Grid = [];
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const strip = this.strips[reel];
      const start = randomInt(0, strip.length - 1);
      const column: SymbolId[] = [];
      for (let row = 0; row < ROW_COUNT; row++) {
        column.push(strip[(start + row) % strip.length]);
      }
      grid.push(column);
    }
    return grid;
  }

  private drawSymbol(reel: number, excludeSpecials = false): SymbolId {
    const strip = this.strips[reel];
    for (let attempts = 0; attempts < 20; attempts++) {
      const symbol = strip[randomInt(0, strip.length - 1)];
      const special =
        symbol === 'SCATTER' || symbol === 'BONUS' || symbol === 'MYSTERY' || symbol === 'WILD';
      if (!excludeSpecials || !special) return symbol;
    }
    return 'PLUM';
  }

  private pushHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    this.history.unshift({ id: this.nextHistoryId++, timestamp: Date.now(), ...entry });
    if (this.history.length > HISTORY_LIMIT) this.history.length = HISTORY_LIMIT;
  }
}


