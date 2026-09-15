import { memo } from "react";
import { classNames } from "../../utils/format";
import {
  formatCompactIndian,
  formatPercent,
  formatPrice,
  formatSignedCompact,
} from "../../utils/format";
import type { OptionChainRow as ChainRow, OptionLeg, OptionType } from "../../types/options";

export interface OptionChainRowProps {
  row: ChainRow;
  spot: number;
  atmStrike: number;
  /** Largest OI in the visible slice, used to scale the in-cell bars. */
  maxOi: number;
  onSelect: (strike: number, optionType: OptionType) => void;
  selectedStrike: number | null;
  selectedType: OptionType | null;
}

function changeClass(value: number): string {
  return value > 0 ? "up" : value < 0 ? "down" : "flat";
}

function OiCell({ leg, maxOi, side }: { leg: OptionLeg; maxOi: number; side: "call" | "put" }) {
  const width = maxOi > 0 ? Math.min(100, (leg.openInterest / maxOi) * 100) : 0;
  return (
    <td className="chain-cell--oi">
      <span className={`chain-oi-bar chain-oi-bar--${side}`} style={{ width: `${width}%` }} />
      {formatCompactIndian(leg.openInterest)}
    </td>
  );
}

/**
 * One strike row. Rendered through a value-comparing `memo` so a streamed chain
 * update repaints only the strikes whose numbers actually moved - the table can
 * hold 60+ rows and re-rendering all of them on every tick is the main
 * performance risk on this screen.
 */
function OptionChainRowComponent({
  row,
  spot,
  atmStrike,
  maxOi,
  onSelect,
  selectedStrike,
  selectedType,
}: OptionChainRowProps) {
  const isAtm = row.strike === atmStrike;
  // Calls are in the money below spot; puts above it.
  const callItm = row.strike < spot && !isAtm;
  const putItm = row.strike > spot && !isAtm;

  const callSelected = selectedStrike === row.strike && selectedType === "CE";
  const putSelected = selectedStrike === row.strike && selectedType === "PE";

  return (
    <tr className={classNames("chain-row", isAtm && "chain-row--atm")}>
      <OiCell leg={row.call} maxOi={maxOi} side="call" />
      <td
        className={classNames(
          callItm && "chain-cell--itm",
          changeClass(row.call.changeInOpenInterest),
        )}
      >
        {formatSignedCompact(row.call.changeInOpenInterest)}
      </td>
      <td className={classNames(callItm && "chain-cell--itm")}>
        {formatCompactIndian(row.call.volume)}
      </td>
      <td className={classNames(callItm && "chain-cell--itm")}>
        {row.call.impliedVolatility.toFixed(2)}
      </td>
      <td
        className={classNames(
          "chain-cell--ltp",
          "chain-cell--interactive",
          callItm && "chain-cell--itm",
        )}
        onClick={() => onSelect(row.strike, "CE")}
        aria-selected={callSelected}
      >
        {formatPrice(row.call.ltp)}
      </td>
      <td
        className={classNames(
          callItm && "chain-cell--itm",
          changeClass(row.call.changePercent),
        )}
      >
        {formatPercent(row.call.changePercent)}
      </td>
      <td className={classNames(callItm && "chain-cell--itm")}>{formatPrice(row.call.bid)}</td>
      <td className={classNames(callItm && "chain-cell--itm")}>{formatPrice(row.call.ask)}</td>

      <td className="chain-cell--strike">{formatPrice(row.strike, 0)}</td>

      <td className={classNames(putItm && "chain-cell--itm")}>{formatPrice(row.put.bid)}</td>
      <td className={classNames(putItm && "chain-cell--itm")}>{formatPrice(row.put.ask)}</td>
      <td
        className={classNames(putItm && "chain-cell--itm", changeClass(row.put.changePercent))}
      >
        {formatPercent(row.put.changePercent)}
      </td>
      <td
        className={classNames(
          "chain-cell--ltp",
          "chain-cell--interactive",
          putItm && "chain-cell--itm",
        )}
        onClick={() => onSelect(row.strike, "PE")}
        aria-selected={putSelected}
      >
        {formatPrice(row.put.ltp)}
      </td>
      <td className={classNames(putItm && "chain-cell--itm")}>
        {row.put.impliedVolatility.toFixed(2)}
      </td>
      <td className={classNames(putItm && "chain-cell--itm")}>
        {formatCompactIndian(row.put.volume)}
      </td>
      <td
        className={classNames(
          putItm && "chain-cell--itm",
          changeClass(row.put.changeInOpenInterest),
        )}
      >
        {formatSignedCompact(row.put.changeInOpenInterest)}
      </td>
      <OiCell leg={row.put} maxOi={maxOi} side="put" />
    </tr>
  );
}

function legEqual(a: OptionLeg, b: OptionLeg): boolean {
  return (
    a.ltp === b.ltp &&
    a.changePercent === b.changePercent &&
    a.bid === b.bid &&
    a.ask === b.ask &&
    a.volume === b.volume &&
    a.openInterest === b.openInterest &&
    a.changeInOpenInterest === b.changeInOpenInterest &&
    a.impliedVolatility === b.impliedVolatility
  );
}

function propsEqual(prev: OptionChainRowProps, next: OptionChainRowProps): boolean {
  return (
    prev.row.strike === next.row.strike &&
    prev.atmStrike === next.atmStrike &&
    prev.maxOi === next.maxOi &&
    // Only the side of spot matters for tinting, not the exact spot value.
    prev.row.strike < prev.spot === next.row.strike < next.spot &&
    prev.selectedStrike === next.selectedStrike &&
    prev.selectedType === next.selectedType &&
    prev.onSelect === next.onSelect &&
    legEqual(prev.row.call, next.row.call) &&
    legEqual(prev.row.put, next.row.put)
  );
}

export const OptionChainRowView = memo(OptionChainRowComponent, propsEqual);
