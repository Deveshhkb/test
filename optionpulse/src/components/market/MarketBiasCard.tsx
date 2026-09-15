import {
  BIAS_DISCLAIMER,
  BIAS_DISPLAY,
  MAX_ABSOLUTE_SCORE,
} from "../../config/marketBias.config";
import type { MarketBiasResult } from "../../types/market";
import { classNames } from "../../utils/format";
import { Badge, type BadgeTone } from "../common/Badge";
import { Panel } from "../common/Panel";
import { StatePanel } from "../common/StatePanel";

const TONES: Record<MarketBiasResult["label"], BadgeTone> = {
  STRONG_BULLISH: "bull",
  BULLISH: "bull",
  SIDEWAYS: "neutral",
  BEARISH: "bear",
  STRONG_BEARISH: "bear",
};

/**
 * Renders the bias score together with every factor that produced it. The
 * breakdown is not optional decoration - it is what keeps the score honest.
 */
export function MarketBiasCard({ bias }: { bias: MarketBiasResult | null }) {
  if (!bias || bias.factors.length === 0) {
    return (
      <Panel title="Market Bias" subtitle="Analytical score">
        <StatePanel
          kind="empty"
          title="Not enough inputs yet"
          message="The bias engine needs price history and an option chain before it can score anything."
        />
      </Panel>
    );
  }

  const tone = TONES[bias.label];
  const colour =
    tone === "bull" ? "var(--bull)" : tone === "bear" ? "var(--bear)" : "var(--text-muted)";
  const magnitude = Math.min(1, Math.abs(bias.score) / MAX_ABSOLUTE_SCORE);
  const half = magnitude * 50;

  return (
    <Panel
      title="Market Bias"
      subtitle="Analytical score — not a prediction"
      actions={<Badge tone="violet">Calculated</Badge>}
    >
      <div className="bias-headline">
        <span className="bias-headline__label" style={{ color: colour }}>
          {BIAS_DISPLAY[bias.label]}
        </span>
        <span className="metric__value num">
          Score {bias.score > 0 ? `+${bias.score}` : bias.score}
        </span>
        <Badge tone={tone}>Signal strength {bias.strength}%</Badge>
      </div>

      <div
        className="bias-meter"
        role="img"
        aria-label={`Bias score ${bias.score} out of a possible ${MAX_ABSOLUTE_SCORE}`}
      >
        <div className="bias-meter__zero" />
        <div
          className="bias-meter__fill"
          style={{
            background: colour,
            left: bias.score >= 0 ? "50%" : `${50 - half}%`,
            width: `${half}%`,
          }}
        />
      </div>
      <div className="bias-scale">
        <span>Strong bearish</span>
        <span>Sideways</span>
        <span>Strong bullish</span>
      </div>

      <ul className="factor-list">
        {bias.factors.map((factor) => (
          <li key={factor.key} className="factor">
            <span className="factor__label">{factor.label}</span>
            <span
              className={classNames(
                "factor__score",
                factor.score > 0 ? "up" : factor.score < 0 ? "down" : "flat",
              )}
            >
              {factor.score > 0 ? `+${factor.score}` : factor.score}
            </span>
            <span className="factor__detail">{factor.detail}</span>
          </li>
        ))}
      </ul>

      <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
        {BIAS_DISCLAIMER}
      </p>
    </Panel>
  );
}
