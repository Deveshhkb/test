import { PCR_BANDS } from "../../calculations/options/pcr";
import type { OptionChainAnalytics } from "../../types/options";
import {
  classNames,
  directionOf,
  formatCompactIndian,
  formatPercent,
  formatPrice,
  formatSignedCompact,
} from "../../utils/format";
import { Badge } from "../common/Badge";
import { KeyValue, Metric } from "../common/Metric";
import { Panel } from "../common/Panel";

/**
 * Panel of chain-derived analytics. Every figure here is CALCULATED from the
 * loaded chain; none of it is quoted by a provider.
 */
export function PcrCard({ analytics }: { analytics: OptionChainAnalytics }) {
  const { pcr } = analytics;
  const tone =
    pcr.pcr >= PCR_BANDS.high ? "bull" : pcr.pcr <= PCR_BANDS.low ? "bear" : "neutral";

  return (
    <Panel
      title="Put-Call Ratio"
      subtitle="Total put OI / total call OI"
      actions={<Badge tone="violet">Calculated</Badge>}
    >
      <div className="metric-row">
        <Metric label="PCR (OI)" value={pcr.pcr.toFixed(2)} size="lg" />
        <Metric label="PCR (volume)" value={pcr.volumePcr.toFixed(2)} />
      </div>

      <div className="kv-list" style={{ marginTop: "var(--space-3)" }}>
        <KeyValue label="Total put OI" value={formatCompactIndian(pcr.totalPutOi)} />
        <KeyValue label="Total call OI" value={formatCompactIndian(pcr.totalCallOi)} />
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <Badge tone={tone}>
          {tone === "neutral" ? "Balanced" : tone === "bull" ? "Put-heavy" : "Call-heavy"}
        </Badge>
      </div>
      <p className="inline-note" style={{ marginTop: "var(--space-2)" }}>
        {pcr.interpretation} PCR describes positioning only; on its own it does not predict
        direction.
      </p>
    </Panel>
  );
}

export function MaxPainCard({ analytics }: { analytics: OptionChainAnalytics }) {
  const { maxPain } = analytics;
  const direction = directionOf(maxPain.distance);

  return (
    <Panel
      title="Max Pain"
      subtitle="Strike of least aggregate writer payout"
      actions={<Badge tone="violet">Calculated</Badge>}
    >
      <div className="metric-row">
        <Metric label="Max pain" value={formatPrice(maxPain.maxPainStrike, 0)} size="lg" />
        <Metric label="Spot" value={formatPrice(maxPain.spot)} />
        <Metric
          label="Distance"
          value={`${maxPain.distance >= 0 ? "+" : ""}${formatPrice(maxPain.distance, 0)}`}
          hint={formatPercent(maxPain.distancePercent)}
          tone={direction === "flat" ? "default" : direction}
        />
      </div>
      <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
        Computed from current open interest across every listed strike. Open interest changes
        through the expiry cycle, so max pain moves with it.
      </p>
    </Panel>
  );
}

export function OiAnalysisCard({ analytics }: { analytics: OptionChainAnalytics }) {
  const { oi } = analytics;
  return (
    <Panel
      title="Open-interest structure"
      subtitle="Notable strikes in this expiry"
      actions={<Badge tone="violet">Calculated</Badge>}
    >
      <div className="kv-list">
        <KeyValue
          label="Highest call OI"
          value={
            oi.highestCallOi
              ? `${formatPrice(oi.highestCallOi.strike, 0)}  (${formatCompactIndian(oi.highestCallOi.value)})`
              : "--"
          }
          tone="down"
        />
        <KeyValue
          label="Highest put OI"
          value={
            oi.highestPutOi
              ? `${formatPrice(oi.highestPutOi.strike, 0)}  (${formatCompactIndian(oi.highestPutOi.value)})`
              : "--"
          }
          tone="up"
        />
        <KeyValue
          label="Largest call OI addition"
          value={
            oi.highestCallOiAddition
              ? `${formatPrice(oi.highestCallOiAddition.strike, 0)}  (${formatSignedCompact(oi.highestCallOiAddition.value)})`
              : "--"
          }
        />
        <KeyValue
          label="Largest put OI addition"
          value={
            oi.highestPutOiAddition
              ? `${formatPrice(oi.highestPutOiAddition.strike, 0)}  (${formatSignedCompact(oi.highestPutOiAddition.value)})`
              : "--"
          }
        />
        <KeyValue
          label="Highest total volume"
          value={
            oi.highestVolumeStrike
              ? `${formatPrice(oi.highestVolumeStrike.strike, 0)}  (${formatCompactIndian(oi.highestVolumeStrike.value)})`
              : "--"
          }
        />
        <KeyValue
          label="Highest IV"
          value={
            oi.highestIvStrike
              ? `${formatPrice(oi.highestIvStrike.strike, 0)}  (${oi.highestIvStrike.value.toFixed(2)}%)`
              : "--"
          }
        />
      </div>
    </Panel>
  );
}

export function SupportResistanceCard({ analytics }: { analytics: OptionChainAnalytics }) {
  const { supportResistance, spot } = analytics;

  return (
    <Panel
      title="Support &amp; resistance"
      subtitle="Analytical model — OI, OI change, volume and distance from spot"
      actions={<Badge tone="violet">Calculated</Badge>}
    >
      <h3 className="metric__label" style={{ marginBottom: "var(--space-1)" }}>
        Resistance
      </h3>
      {supportResistance.resistances.length === 0 && (
        <p className="inline-note">No qualifying strike above spot in range.</p>
      )}
      {supportResistance.resistances.map((level) => (
        <LevelRow key={`r-${level.strike}`} level={level} tone="bear" spot={spot} />
      ))}

      <h3 className="metric__label" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        Support
      </h3>
      {supportResistance.supports.length === 0 && (
        <p className="inline-note">No qualifying strike below spot in range.</p>
      )}
      {supportResistance.supports.map((level) => (
        <LevelRow key={`s-${level.strike}`} level={level} tone="bull" spot={spot} />
      ))}

      <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
        Strength is a relative 0-100 score from this chain's own distribution, not a
        probability.
      </p>
    </Panel>
  );
}

function LevelRow({
  level,
  tone,
  spot,
}: {
  level: { strike: number; strength: number };
  tone: "bull" | "bear";
  spot: number;
}) {
  const colour = tone === "bull" ? "var(--bull)" : "var(--bear)";
  const distancePercent = ((level.strike - spot) / spot) * 100;
  return (
    <div className="level">
      <span className={classNames("level__strike")} style={{ color: colour }}>
        {formatPrice(level.strike, 0)}
      </span>
      <span className="level__bar">
        <span
          className="level__bar-fill"
          style={{ width: `${level.strength}%`, background: colour }}
        />
      </span>
      <span className="level__strength" title={`${formatPercent(distancePercent)} from spot`}>
        {level.strength}
      </span>
    </div>
  );
}
