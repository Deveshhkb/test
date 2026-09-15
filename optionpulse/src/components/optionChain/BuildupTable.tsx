import { useMemo } from "react";
import { detectBuildup } from "../../calculations/options/buildup";
import type { BuildupType, OptionChainRow } from "../../types/options";
import {
  classNames,
  formatCompactIndian,
  formatPercent,
  formatPrice,
  formatSignedCompact,
} from "../../utils/format";
import { Badge, type BadgeTone } from "../common/Badge";
import { Panel } from "../common/Panel";
import { StatePanel } from "../common/StatePanel";

const TONES: Record<BuildupType, BadgeTone> = {
  LONG_BUILDUP: "bull",
  SHORT_COVERING: "bull",
  SHORT_BUILDUP: "bear",
  LONG_UNWINDING: "bear",
  NEUTRAL: "neutral",
};

interface BuildupTableProps {
  rows: OptionChainRow[];
  atmStrike: number;
  /** How many strikes either side of ATM to classify. */
  span?: number;
}

/**
 * Buildup classification for the strikes around ATM.
 *
 * Classification itself lives in `detectBuildup` - this component only selects
 * rows and renders the result.
 */
export function BuildupTable({ rows, atmStrike, span = 5 }: BuildupTableProps) {
  const classified = useMemo(() => {
    const atmIndex = rows.findIndex((row) => row.strike === atmStrike);
    if (atmIndex === -1) return [];
    const start = Math.max(0, atmIndex - span);
    const end = Math.min(rows.length, atmIndex + span + 1);
    return rows.slice(start, end).map((row) => ({
      strike: row.strike,
      call: detectBuildup(row.call.change, row.call.changeInOpenInterest),
      put: detectBuildup(row.put.change, row.put.changeInOpenInterest),
      callOiChange: row.call.changeInOpenInterest,
      putOiChange: row.put.changeInOpenInterest,
      callChangePercent: row.call.changePercent,
      putChangePercent: row.put.changePercent,
      callOi: row.call.openInterest,
      putOi: row.put.openInterest,
    }));
  }, [rows, atmStrike, span]);

  if (classified.length === 0) {
    return (
      <Panel title="Option buildup">
        <StatePanel
          kind="empty"
          message="Load an option chain to classify buildup by strike."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Option buildup"
      subtitle={`Price change vs open-interest change, ${span} strikes either side of ATM`}
      actions={<Badge tone="violet">Calculated</Badge>}
      flush
    >
      <div className="chain-scroll" style={{ maxHeight: 420 }}>
        <table className="chain-table" style={{ minWidth: 640 }}>
          <thead>
            <tr className="chain-col-row">
              <th style={{ textAlign: "left" }}>Strike</th>
              <th>Call chg %</th>
              <th>Call OI chg</th>
              <th style={{ textAlign: "left" }}>Call buildup</th>
              <th>Put chg %</th>
              <th>Put OI chg</th>
              <th style={{ textAlign: "left" }}>Put buildup</th>
            </tr>
          </thead>
          <tbody>
            {classified.map((entry) => (
              <tr
                key={entry.strike}
                className={classNames(
                  "chain-row",
                  entry.strike === atmStrike && "chain-row--atm",
                )}
              >
                <td style={{ textAlign: "left", fontWeight: 700 }}>
                  {formatPrice(entry.strike, 0)}
                </td>
                <td className={entry.callChangePercent >= 0 ? "up" : "down"}>
                  {formatPercent(entry.callChangePercent)}
                </td>
                <td className={entry.callOiChange >= 0 ? "up" : "down"}>
                  {formatSignedCompact(entry.callOiChange)}
                </td>
                <td style={{ textAlign: "left" }}>
                  <Badge tone={TONES[entry.call.type]} title={entry.call.description}>
                    {entry.call.label}
                  </Badge>
                </td>
                <td className={entry.putChangePercent >= 0 ? "up" : "down"}>
                  {formatPercent(entry.putChangePercent)}
                </td>
                <td className={entry.putOiChange >= 0 ? "up" : "down"}>
                  {formatSignedCompact(entry.putOiChange)}
                </td>
                <td style={{ textAlign: "left" }}>
                  <Badge tone={TONES[entry.put.type]} title={entry.put.description}>
                    {entry.put.label}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="inline-note" style={{ padding: "var(--space-2) var(--space-4)" }}>
        Total OI at ATM: calls{" "}
        {formatCompactIndian(classified.find((e) => e.strike === atmStrike)?.callOi ?? 0)}, puts{" "}
        {formatCompactIndian(classified.find((e) => e.strike === atmStrike)?.putOi ?? 0)}.
      </p>
    </Panel>
  );
}
