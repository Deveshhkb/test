import type { MarketStatus } from "../../types/market";
import { Badge, type BadgeTone } from "../common/Badge";

const TONES: Record<MarketStatus["phase"], BadgeTone> = {
  OPEN: "bull",
  PRE_OPEN: "warn",
  CLOSED: "neutral",
  WEEKEND: "neutral",
  HOLIDAY: "violet",
};

/** Market status is derived from IST session hours, never hardcoded. */
export function MarketStatusPill({ status }: { status: MarketStatus }) {
  return (
    <Badge
      tone={TONES[status.phase]}
      dot
      pulse={status.isOpen}
      title={status.nextChangeLabel ?? undefined}
    >
      {status.label}
    </Badge>
  );
}
