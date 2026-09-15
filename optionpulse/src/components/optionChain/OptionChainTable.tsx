import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCenterStickyOffset } from "../../hooks/useCenterStickyOffset";
import type { OptionChainRow as ChainRow, OptionType } from "../../types/options";
import { StatePanel } from "../common/StatePanel";
import { OptionChainRowView } from "./OptionChainRow";

const CALL_COLUMNS = ["OI", "OI Chg", "Volume", "IV", "LTP", "Chg %", "Bid", "Ask"];
const PUT_COLUMNS = ["Bid", "Ask", "Chg %", "LTP", "IV", "Volume", "OI Chg", "OI"];

interface OptionChainTableProps {
  rows: ChainRow[];
  spot: number;
  atmStrike: number;
  onSelectContract: (strike: number, optionType: OptionType) => void;
  selectedStrike: number | null;
  selectedType: OptionType | null;
  /**
   * Changing this re-centres the view. Pass something that identifies the
   * chain (symbol + expiry) so switching underlying jumps back to ATM, while
   * streamed updates leave the user's scroll position alone.
   */
  resetKey: string;
}

export function OptionChainTable({
  rows,
  spot,
  atmStrike,
  onSelectContract,
  selectedStrike,
  selectedType,
  resetKey,
}: OptionChainTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useCenterStickyOffset(scrollRef);
  const centredFor = useRef<string | null>(null);

  /**
   * On a narrow screen the ladder is wider than the viewport, so the strike
   * column starts off-screen. Centre it - and the ATM row - once per chain.
   */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || rows.length === 0 || centredFor.current === resetKey) return;

    const strikeCell = container.querySelector<HTMLElement>("tbody .chain-cell--strike");
    if (strikeCell) {
      container.scrollLeft = Math.max(
        0,
        strikeCell.offsetLeft - (container.clientWidth - strikeCell.offsetWidth) / 2,
      );
    }
    const atmRow = container.querySelector<HTMLElement>(".chain-row--atm");
    if (atmRow) {
      container.scrollTop = Math.max(0, atmRow.offsetTop - container.clientHeight / 2);
    }
    centredFor.current = resetKey;
  }, [rows, resetKey]);

  const maxOi = useMemo(
    () =>
      rows.reduce(
        (highest, row) => Math.max(highest, row.call.openInterest, row.put.openInterest),
        0,
      ),
    [rows],
  );

  // Stable identity keeps the memoised rows from re-rendering on every tick.
  const handleSelect = useCallback(
    (strike: number, optionType: OptionType) => onSelectContract(strike, optionType),
    [onSelectContract],
  );

  if (rows.length === 0) {
    return (
      <StatePanel
        kind="empty"
        title="No strikes in this range"
        message="Widen the strike filter or clear the custom range to see contracts."
      />
    );
  }

  return (
    <div
      className="chain-scroll"
      ref={scrollRef}
      tabIndex={0}
      aria-label="Option chain, scrollable"
    >
      <table className="chain-table">
        <caption className="visually-hidden">
          Option chain by strike. Calls on the left, puts on the right.
        </caption>
        <thead>
          <tr className="chain-group-row">
            <th className="chain-group--calls" colSpan={CALL_COLUMNS.length} scope="colgroup">
              Calls
            </th>
            <th className="chain-cell--strike" scope="col">
              Strike
            </th>
            <th className="chain-group--puts" colSpan={PUT_COLUMNS.length} scope="colgroup">
              Puts
            </th>
          </tr>
          <tr className="chain-col-row">
            {CALL_COLUMNS.map((column) => (
              <th key={`call-${column}`} scope="col">
                {column}
              </th>
            ))}
            <th className="chain-cell--strike" scope="col">
              <span className="visually-hidden">Strike price</span>
            </th>
            {PUT_COLUMNS.map((column) => (
              <th key={`put-${column}`} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <OptionChainRowView
              key={row.strike}
              row={row}
              spot={spot}
              atmStrike={atmStrike}
              maxOi={maxOi}
              onSelect={handleSelect}
              selectedStrike={selectedStrike}
              selectedType={selectedType}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OptionChainLegend() {
  return (
    <div className="chain-legend">
      <span className="chain-legend__item">
        <span className="chain-legend__swatch" style={{ background: "var(--atm-tint)" }} />
        ATM strike
      </span>
      <span className="chain-legend__item">
        <span className="chain-legend__swatch" style={{ background: "var(--itm-tint)" }} />
        In the money
      </span>
      <span className="chain-legend__item">
        <span
          className="chain-legend__swatch"
          style={{ background: "var(--bear)", opacity: 0.25 }}
        />
        Call OI
      </span>
      <span className="chain-legend__item">
        <span
          className="chain-legend__swatch"
          style={{ background: "var(--bull)", opacity: 0.25 }}
        />
        Put OI
      </span>
      <span className="chain-legend__item">
        OI and volume shown in Indian units (K / L / Cr)
      </span>
    </div>
  );
}
