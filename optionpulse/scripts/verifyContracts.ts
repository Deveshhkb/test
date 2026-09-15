/**
 * Compares src/config/underlyings.ts against Angel One's live instrument
 * master and reports any drift.
 *
 * Contract specs change by exchange circular - lot sizes and expiry weekdays
 * in particular. Getting them wrong is silent: the app still renders, it just
 * builds the wrong expiry ladder. Run this after any circular.
 *
 *   npx tsx scripts/verifyContracts.ts
 */
import { UNDERLYING_LIST, expiryWeekdayName } from "../src/config/underlyings";
import type { UnderlyingSymbol } from "../src/types/market";
import { istToEpoch, toIstParts } from "../src/utils/time";
import {
  SCRIP_MASTER_URL,
  buildInstrumentIndex,
  getExpiryLadder,
  inferStrikeInterval,
  listExpiries,
  type ScripMasterRow,
} from "../server/providers/angelone/instrumentMaster";
import { isRelevantRow } from "../server/providers/angelone/instrumentMasterStore";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayOf(isoDate: string): string {
  return WEEKDAYS[toIstParts(istToEpoch(isoDate, 12 * 60)).weekday];
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
}

async function main(): Promise<void> {
  process.stdout.write(`Downloading instrument master...\n`);
  const response = await fetch(SCRIP_MASTER_URL, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const rows = ((await response.json()) as ScripMasterRow[]).filter(isRelevantRow);
  const index = buildInstrumentIndex(rows);

  const problems: string[] = [];

  for (const config of UNDERLYING_LIST) {
    const symbol = config.symbol as UnderlyingSymbol;
    const expiries = listExpiries(index, symbol);
    if (expiries.length === 0) {
      problems.push(`${symbol}: no contracts found in the instrument master.`);
      continue;
    }

    const nearest = expiries[0];
    const ladder = getExpiryLadder(index, symbol, nearest);
    const strikes = [...new Set(ladder.map((option) => option.strike))];
    const midStrike = strikes[Math.floor(strikes.length / 2)] ?? 0;

    const observedWeekday = mostCommon(expiries.map(weekdayOf));
    const observedLot = mostCommon(ladder.map((option) => String(option.lotSize)));
    const observedInterval = inferStrikeInterval(strikes, midStrike);
    // Weekly series exist when a month holds more than one expiry.
    const perMonth = new Map<string, number>();
    expiries.forEach((date) =>
      perMonth.set(date.slice(0, 7), (perMonth.get(date.slice(0, 7)) ?? 0) + 1),
    );
    const observedWeekly = [...perMonth.values()].some((count) => count > 1);

    const configured = {
      weekday: expiryWeekdayName(symbol),
      lotSize: String(config.lotSize),
      interval: config.strikeInterval,
      weekly: config.hasWeeklyExpiry,
    };

    process.stdout.write(
      `\n${config.name}\n` +
        `  expiry weekday : configured ${configured.weekday.padEnd(9)} observed ${observedWeekday}\n` +
        `  lot size       : configured ${configured.lotSize.padEnd(9)} observed ${observedLot}\n` +
        `  strike interval: configured ${String(configured.interval).padEnd(9)} observed ${observedInterval}\n` +
        `  weekly series  : configured ${String(configured.weekly).padEnd(9)} observed ${observedWeekly}\n` +
        `  next expiries  : ${expiries.slice(0, 4).join(", ")}\n`,
    );

    if (observedWeekday !== configured.weekday) {
      problems.push(
        `${symbol}: expiry weekday is ${observedWeekday}, config says ${configured.weekday}.`,
      );
    }
    if (observedLot !== configured.lotSize) {
      problems.push(
        `${symbol}: lot size is ${observedLot}, config says ${configured.lotSize}.`,
      );
    }
    if (observedInterval !== null && observedInterval !== configured.interval) {
      problems.push(
        `${symbol}: near-the-money strike interval is ${observedInterval}, config says ${configured.interval}.`,
      );
    }
    if (observedWeekly !== configured.weekly) {
      problems.push(
        `${symbol}: weekly series ${observedWeekly}, config says ${configured.weekly}.`,
      );
    }
  }

  if (problems.length === 0) {
    process.stdout.write(`\nAll contract specifications match the instrument master.\n`);
    return;
  }
  process.stdout.write(`\nDrift detected - update src/config/underlyings.ts:\n`);
  problems.forEach((problem) => process.stdout.write(`  - ${problem}\n`));
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
