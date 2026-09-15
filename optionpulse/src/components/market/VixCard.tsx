import type { VixQuote } from "../../types/market";
import {
  classNames,
  directionOf,
  formatPercent,
  formatPrice,
  formatSigned,
} from "../../utils/format";
import { Badge } from "../common/Badge";
import { DataModeBadge } from "../common/DataModeBadge";

/**
 * India VIX. Rising volatility is presented as a risk condition, not as a
 * directional call.
 */
export function VixCard({ vix }: { vix: VixQuote }) {
  const direction = directionOf(vix.change);
  const regime = vix.value >= 18 ? "Elevated" : vix.value <= 12 ? "Calm" : "Moderate";
  const tone = vix.value >= 18 ? "warn" : vix.value <= 12 ? "bull" : "neutral";

  return (
    <article className="index-card">
      <div className="index-card__head">
        <span className="index-card__name">India VIX</span>
        <Badge tone={tone} title="Volatility regime, derived from the current VIX level.">
          {regime}
        </Badge>
      </div>

      <div>
        <div className="index-card__ltp">{formatPrice(vix.value)}</div>
        <div className={classNames("index-card__change", direction)}>
          {formatSigned(vix.change)} ({formatPercent(vix.changePercent)})
        </div>
      </div>

      <p className="inline-note">
        Implied volatility expectation for the next 30 days. Higher readings mean the market is
        pricing a wider range, in either direction.
      </p>

      <DataModeBadge mode={vix.mode} compact />
    </article>
  );
}
