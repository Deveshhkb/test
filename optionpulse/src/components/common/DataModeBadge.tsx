import { DATA_MODE_COPY } from "../../config/dataMode";
import type { DataMode } from "../../types/market";
import { Badge, type BadgeTone } from "./Badge";

const TONES: Record<DataMode, BadgeTone> = {
  MOCK: "warn",
  DELAYED: "warn",
  LIVE: "bull",
  CALCULATED: "violet",
  ESTIMATED: "violet",
};

/**
 * Every number in the product carries its provenance. Mock data is never
 * labelled LIVE, and derived values are marked CALCULATED rather than quoted.
 */
export function DataModeBadge({ mode, compact }: { mode: DataMode; compact?: boolean }) {
  const copy = DATA_MODE_COPY[mode];
  return (
    <Badge tone={TONES[mode]} dot pulse={mode === "LIVE"} title={copy.description}>
      {compact ? copy.label.split(" ")[0] : copy.label}
    </Badge>
  );
}
