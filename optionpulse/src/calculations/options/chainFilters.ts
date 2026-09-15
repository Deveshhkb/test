import type { OptionChainRow } from "../../types/options";

export type StrikeFilterId = "ALL" | "ATM5" | "ATM10" | "ATM20" | "ITM" | "OTM" | "CUSTOM";

export interface StrikeFilter {
  id: StrikeFilterId;
  label: string;
  description: string;
}

export const STRIKE_FILTERS: StrikeFilter[] = [
  { id: "ALL", label: "All", description: "Every strike published for this expiry" },
  { id: "ATM5", label: "ATM ± 5", description: "Five strikes either side of ATM" },
  { id: "ATM10", label: "ATM ± 10", description: "Ten strikes either side of ATM" },
  { id: "ATM20", label: "ATM ± 20", description: "Twenty strikes either side of ATM" },
  {
    id: "ITM",
    label: "ITM",
    description: "Strikes whose calls are in the money (at or below ATM)",
  },
  {
    id: "OTM",
    label: "OTM",
    description: "Strikes whose calls are out of the money (at or above ATM)",
  },
  { id: "CUSTOM", label: "Custom", description: "A strike range you set yourself" },
];

export interface CustomStrikeRange {
  min: number | null;
  max: number | null;
}

/**
 * Applies a strike filter to a chain.
 *
 * The ITM and OTM views split the ladder at ATM: every strike at or below ATM
 * has an in-the-money call and an out-of-the-money put, and vice versa above
 * it, which is how the two halves of a chain are read in practice.
 */
export function filterChainRows(
  rows: OptionChainRow[],
  filter: StrikeFilterId,
  atmStrike: number,
  strikeInterval: number,
  customRange?: CustomStrikeRange,
): OptionChainRow[] {
  switch (filter) {
    case "ATM5":
      return withinSteps(rows, atmStrike, strikeInterval, 5);
    case "ATM10":
      return withinSteps(rows, atmStrike, strikeInterval, 10);
    case "ATM20":
      return withinSteps(rows, atmStrike, strikeInterval, 20);
    case "ITM":
      return rows.filter((row) => row.strike <= atmStrike);
    case "OTM":
      return rows.filter((row) => row.strike >= atmStrike);
    case "CUSTOM": {
      const min = customRange?.min ?? Number.NEGATIVE_INFINITY;
      const max = customRange?.max ?? Number.POSITIVE_INFINITY;
      return rows.filter((row) => row.strike >= min && row.strike <= max);
    }
    case "ALL":
    default:
      return rows;
  }
}

function withinSteps(
  rows: OptionChainRow[],
  atmStrike: number,
  strikeInterval: number,
  steps: number,
): OptionChainRow[] {
  const span = steps * strikeInterval;
  return rows.filter((row) => Math.abs(row.strike - atmStrike) <= span);
}
