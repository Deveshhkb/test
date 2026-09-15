/**
 * Indian equity-derivatives session times, expressed in IST minutes from midnight.
 * Kept as data so `marketStatus` never hardcodes a phase.
 */
export const IST_OFFSET_MINUTES = 5 * 60 + 30;

export const MARKET_HOURS = {
  preOpenStart: 9 * 60, // 09:00 IST
  preOpenEnd: 9 * 60 + 8, // 09:08 IST
  open: 9 * 60 + 15, // 09:15 IST
  close: 15 * 60 + 30, // 15:30 IST
} as const;

/**
 * Trading holidays are published yearly by the exchanges. This list is
 * configuration and must be refreshed each year; an empty list simply means
 * only weekends are treated as non-trading days.
 */
export const TRADING_HOLIDAYS_ISO: string[] = [
  "2026-01-26",
  "2026-03-03",
  "2026-03-19",
  "2026-04-01",
  "2026-04-03",
  "2026-04-14",
  "2026-05-01",
  "2026-08-15",
  "2026-10-02",
  "2026-11-10",
  "2026-12-25",
];
