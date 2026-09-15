import { describeBreadth } from "../../calculations/market/marketBreadth";
import type { InstitutionalActivity, MarketBreadth } from "../../types/market";
import { classNames, directionOf, formatCrore, formatInteger } from "../../utils/format";
import { DataModeBadge } from "../common/DataModeBadge";
import { KeyValue } from "../common/Metric";
import { Panel } from "../common/Panel";

export function BreadthCard({ breadth }: { breadth: MarketBreadth }) {
  const total = breadth.advances + breadth.declines + breadth.unchanged;
  const advancePercent = total > 0 ? (breadth.advances / total) * 100 : 0;
  const declinePercent = total > 0 ? (breadth.declines / total) * 100 : 0;

  return (
    <Panel
      title="Market breadth"
      subtitle={describeBreadth(breadth.advanceDeclineRatio)}
      actions={<DataModeBadge mode={breadth.mode} compact />}
    >
      <div
        style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2 }}
        role="img"
        aria-label={`${breadth.advances} advances, ${breadth.declines} declines`}
      >
        <span style={{ width: `${advancePercent}%`, background: "var(--bull)" }} />
        <span style={{ width: `${declinePercent}%`, background: "var(--bear)" }} />
        <span style={{ flex: 1, background: "var(--surface-3)" }} />
      </div>

      <div className="kv-list" style={{ marginTop: "var(--space-3)" }}>
        <KeyValue label="Advances" value={formatInteger(breadth.advances)} tone="up" />
        <KeyValue label="Declines" value={formatInteger(breadth.declines)} tone="down" />
        <KeyValue label="Unchanged" value={formatInteger(breadth.unchanged)} />
        <KeyValue
          label="A/D ratio"
          value={breadth.advanceDeclineRatio.toFixed(2)}
          tone={breadth.advanceDeclineRatio >= 1 ? "up" : "down"}
        />
      </div>
    </Panel>
  );
}

export function InstitutionalFlowCard({ activity }: { activity: InstitutionalActivity }) {
  const net = activity.fiiNetCrore + activity.diiNetCrore;
  return (
    <Panel
      title="FII / DII activity"
      subtitle={`Cash-market net flow, ${activity.date}`}
      actions={<DataModeBadge mode={activity.mode} compact />}
    >
      <div className="kv-list">
        <KeyValue
          label="FII net"
          value={formatCrore(activity.fiiNetCrore)}
          tone={directionOf(activity.fiiNetCrore)}
        />
        <KeyValue
          label="DII net"
          value={formatCrore(activity.diiNetCrore)}
          tone={directionOf(activity.diiNetCrore)}
        />
        <KeyValue
          label="Combined"
          value={formatCrore(net)}
          tone={classNames(directionOf(net))}
        />
      </div>
      <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
        Institutional flow is reported after the session and is one input among many.
      </p>
    </Panel>
  );
}
