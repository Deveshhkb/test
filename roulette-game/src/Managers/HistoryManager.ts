import { GameEvent, HistoryEntry, PocketColor, RouletteNumber, Statistics } from '../Types';
import { getNumberColor } from '../Game/Constants';
import { EventBus } from '../Utilities/EventBus';
import { numberKey, uniqueId } from '../Utilities/Helpers';

/**
 * Rolling result history and the derived statistics panel.
 *
 * The statistics object is rebuilt on every push rather than incrementally
 * patched. With a bounded window (200 entries by default) that is a few
 * microseconds once per round - far cheaper than the class of bug where an
 * incremental counter drifts out of sync with the list after a server
 * `SYNC_HISTORY` replaces the window wholesale.
 */
export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private stats: Statistics;

  public constructor(
    private readonly bus: EventBus,
    /** How many results to retain. The UI shows a subset of this. */
    private readonly maxEntries = 200,
  ) {
    this.stats = this.computeStatistics();
  }

  /* --------------------------------------------------------------------- */
  /* Mutation                                                              */
  /* --------------------------------------------------------------------- */

  public push(number: RouletteNumber, roundId = uniqueId('round')): HistoryEntry {
    const entry: HistoryEntry = {
      roundId,
      number,
      color: getNumberColor(number),
      timestamp: Date.now(),
    };

    // Newest first - the UI reads left-to-right from index 0.
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) this.entries.length = this.maxEntries;

    this.stats = this.computeStatistics();
    this.bus.emit(GameEvent.HISTORY_UPDATE, { entries: this.entries, stats: this.stats });
    return entry;
  }

  /** Replace the window from a server snapshot (reconnect, or a late join). */
  public sync(entries: readonly HistoryEntry[]): void {
    this.entries = entries.slice(0, this.maxEntries).map((entry) => ({
      ...entry,
      // Trust the number, recompute the colour - a mismatch in a server payload
      // must not paint a red 17 on the history strip.
      color: getNumberColor(entry.number),
    }));
    this.stats = this.computeStatistics();
    this.bus.emit(GameEvent.HISTORY_UPDATE, { entries: this.entries, stats: this.stats });
  }

  public clear(): void {
    this.entries = [];
    this.stats = this.computeStatistics();
    this.bus.emit(GameEvent.HISTORY_UPDATE, { entries: this.entries, stats: this.stats });
  }

  /* --------------------------------------------------------------------- */
  /* Queries                                                               */
  /* --------------------------------------------------------------------- */

  public getEntries(limit?: number): readonly HistoryEntry[] {
    return limit === undefined ? this.entries : this.entries.slice(0, limit);
  }

  public getStatistics(): Statistics {
    return this.stats;
  }

  public getLast(): HistoryEntry | undefined {
    return this.entries[0];
  }

  /** Current run of consecutive results sharing the newest entry's colour. */
  public getColorStreak(): { color: PocketColor; length: number } | undefined {
    const first = this.entries[0];
    if (!first) return undefined;

    let length = 1;
    while (length < this.entries.length && this.entries[length].color === first.color) {
      length += 1;
    }
    return { color: first.color, length };
  }

  /* --------------------------------------------------------------------- */
  /* Statistics                                                            */
  /* --------------------------------------------------------------------- */

  private computeStatistics(): Statistics {
    const hits: Record<string, number> = {};
    let red = 0;
    let black = 0;
    let green = 0;
    let odd = 0;
    let even = 0;
    let low = 0;
    let high = 0;
    const dozens: [number, number, number] = [0, 0, 0];
    const columns: [number, number, number] = [0, 0, 0];

    for (const entry of this.entries) {
      const key = numberKey(entry.number);
      hits[key] = (hits[key] ?? 0) + 1;

      if (entry.color === PocketColor.RED) red += 1;
      else if (entry.color === PocketColor.BLACK) black += 1;
      else green += 1;

      // Zeroes belong to no outside bet - they are the house edge itself.
      if (entry.number === 0 || entry.number === '00') continue;

      const value = entry.number as number;
      if (value % 2 === 0) even += 1;
      else odd += 1;
      if (value <= 18) low += 1;
      else high += 1;

      dozens[Math.floor((value - 1) / 12)] += 1;
      // Column 1 is 1,4,7...; the layout's top row is column 3.
      columns[(value - 1) % 3] += 1;
    }

    const ranked = Object.entries(hits).sort((a, b) => b[1] - a[1]);
    const hot = ranked.slice(0, 5).map(([key]) => this.parseKey(key));
    const cold = this.findColdNumbers(hits);

    return {
      total: this.entries.length,
      red,
      black,
      green,
      odd,
      even,
      low,
      high,
      dozens,
      columns,
      hits,
      hot,
      cold,
    };
  }

  /**
   * Coldest numbers = those absent from the window entirely, then the least
   * frequent. Players read this panel constantly, so "never seen" must outrank
   * "seen once" rather than being lost in a frequency sort.
   */
  private findColdNumbers(hits: Record<string, number>): RouletteNumber[] {
    const unseen: RouletteNumber[] = [];
    for (let n = 0; n <= 36; n += 1) {
      if (!hits[String(n)]) unseen.push(n);
    }
    if (unseen.length >= 5) return unseen.slice(0, 5);

    const leastFrequent = Object.entries(hits)
      .sort((a, b) => a[1] - b[1])
      .map(([key]) => this.parseKey(key));

    return [...unseen, ...leastFrequent].slice(0, 5);
  }

  private parseKey(key: string): RouletteNumber {
    return key === '00' ? '00' : Number(key);
  }
}
