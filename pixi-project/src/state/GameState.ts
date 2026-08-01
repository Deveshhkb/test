export type BetSpot = "dragon" | "tie" | "tiger";
export type RoundResult = BetSpot;

export interface Chip {
  value: number;
  label: string;
  texture: string;
}

export const CHIPS: Chip[] = [
  { value: 100, label: "100", texture: "/assets/100_b.png" },
  { value: 500, label: "500", texture: "/assets/500_b.png" },
  { value: 10_000, label: "10k", texture: "/assets/10k_b.png" },
  { value: 25_000, label: "25k", texture: "/assets/25k_b.png" },
  { value: 100_000, label: "100k", texture: "/assets/100k_b.png" },
];

type Listener = () => void;

/**
 * Minimal observable game state. Kept deliberately framework-free so the UI
 * layer can be rebuilt for a different layout mode without touching game data.
 */
export class GameState {
  balance = 2_500_000;
  selectedChip: Chip = CHIPS[0];
  bets: Record<BetSpot, number> = { dragon: 0, tie: 0, tiger: 0 };
  history: RoundResult[] = [
    "dragon",
    "tiger",
    "tie",
    "dragon",
    "dragon",
    "tiger",
    "tie",
    "tiger",
  ];

  private lastBets: Record<BetSpot, number> | null = null;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get totalBet(): number {
    return this.bets.dragon + this.bets.tie + this.bets.tiger;
  }

  selectChip(chip: Chip): void {
    this.selectedChip = chip;
    this.emit();
  }

  /** Returns true when the bet was affordable and applied. */
  placeBet(spot: BetSpot, amount = this.selectedChip.value): boolean {
    if (amount > this.balance) return false;
    this.balance -= amount;
    this.bets[spot] += amount;
    this.emit();
    return true;
  }

  clearBets(): void {
    if (this.totalBet === 0) return;
    this.balance += this.totalBet;
    this.bets = { dragon: 0, tie: 0, tiger: 0 };
    this.emit();
  }

  doubleBets(): void {
    if (this.totalBet === 0 || this.totalBet > this.balance) return;
    this.balance -= this.totalBet;
    this.bets = {
      dragon: this.bets.dragon * 2,
      tie: this.bets.tie * 2,
      tiger: this.bets.tiger * 2,
    };
    this.emit();
  }

  repeatBets(): void {
    const previous = this.lastBets;
    if (!previous) return;
    const total = previous.dragon + previous.tie + previous.tiger;
    if (total > this.balance) return;
    this.balance -= total;
    this.bets = { ...previous };
    this.emit();
  }

  /** Settles the round, records the result and returns the payout. */
  settle(result: RoundResult): number {
    this.lastBets = { ...this.bets };
    const multiplier = result === "tie" ? 9 : 2;
    const payout = this.bets[result] * multiplier;
    this.balance += payout;
    this.bets = { dragon: 0, tie: 0, tiger: 0 };
    this.history = [result, ...this.history].slice(0, 40);
    this.emit();
    return payout;
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const formatMoney = (value: number): string =>
  value.toLocaleString("en-US");

/** Compact currency for narrow panels: 2.5M / 120K / 900. */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimZero(value / 1_000)}K`;
  return String(value);
}

function trimZero(value: number): string {
  return value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, "");
}
