import { memo } from "react";
import type { Quote } from "../../types/market";
import {
  classNames,
  directionOf,
  formatPercent,
  formatPrice,
  formatSigned,
} from "../../utils/format";
import { Badge } from "../common/Badge";
import { DataModeBadge } from "../common/DataModeBadge";

interface IndexCardProps {
  quote: Quote;
  onSelect?: (symbol: Quote["symbol"]) => void;
  selected?: boolean;
}

/**
 * Compact index tile. Memoised because the dashboard re-renders on every
 * streamed tick and only the changed card needs to repaint.
 */
export const IndexCard = memo(function IndexCard({
  quote,
  onSelect,
  selected,
}: IndexCardProps) {
  const direction = directionOf(quote.change);
  const dayTrend = describeDayTrend(quote.changePercent);

  return (
    <article
      className={classNames(
        "index-card",
        direction === "up" && "index-card--up",
        direction === "down" && "index-card--down",
      )}
      style={selected ? { borderColor: "var(--accent)" } : undefined}
      onClick={onSelect ? () => onSelect(quote.symbol) : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(quote.symbol);
              }
            }
          : undefined
      }
    >
      <div className="index-card__head">
        <span className="index-card__name">{quote.name}</span>
        <Badge tone={dayTrend.tone} title="Direction of today's move. Not a forecast.">
          {dayTrend.label}
        </Badge>
      </div>

      <div>
        <div className="index-card__ltp">{formatPrice(quote.ltp)}</div>
        <div className={classNames("index-card__change", direction)}>
          {formatSigned(quote.change)} ({formatPercent(quote.changePercent)})
        </div>
      </div>

      <DayRangeMeter low={quote.low} high={quote.high} ltp={quote.ltp} />

      <div className="index-card__stats">
        <StatPair label="Open" value={formatPrice(quote.open)} />
        <StatPair label="Prev close" value={formatPrice(quote.previousClose)} />
        <StatPair label="High" value={formatPrice(quote.high)} />
        <StatPair label="Low" value={formatPrice(quote.low)} />
      </div>

      <DataModeBadge mode={quote.mode} compact />
    </article>
  );
});

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pair">
      <span className="stat-pair__label">{label}</span>
      <span className="stat-pair__value">{value}</span>
    </div>
  );
}

export function DayRangeMeter({ low, high, ltp }: { low: number; high: number; ltp: number }) {
  const span = high - low;
  const position = span > 0 ? ((ltp - low) / span) * 100 : 50;
  return (
    <div className="range-meter">
      <div className="range-meter__track">
        <div className="range-meter__fill" />
        <div
          className="range-meter__marker"
          style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
        />
      </div>
      <div className="range-meter__labels">
        <span>{formatPrice(low)}</span>
        <span>Day range</span>
        <span>{formatPrice(high)}</span>
      </div>
    </div>
  );
}

/** Purely descriptive: it restates the day's move, it does not forecast it. */
function describeDayTrend(changePercent: number): {
  label: string;
  tone: "bull" | "bear" | "neutral";
} {
  if (changePercent >= 0.5) return { label: "Up strongly", tone: "bull" };
  if (changePercent > 0.05) return { label: "Up", tone: "bull" };
  if (changePercent <= -0.5) return { label: "Down strongly", tone: "bear" };
  if (changePercent < -0.05) return { label: "Down", tone: "bear" };
  return { label: "Flat", tone: "neutral" };
}
