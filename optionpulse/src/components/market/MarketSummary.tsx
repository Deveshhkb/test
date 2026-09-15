import { UNDERLYING_LIST } from "../../config/underlyings";
import type { MarketSnapshot, UnderlyingSymbol } from "../../types/market";
import { StatePanel } from "../common/StatePanel";
import { IndexCard } from "./IndexCard";
import { VixCard } from "./VixCard";

interface MarketSummaryProps {
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
  selectedSymbol?: UnderlyingSymbol;
  onSelect?: (symbol: UnderlyingSymbol) => void;
}

export function MarketSummary({
  snapshot,
  loading,
  error,
  selectedSymbol,
  onSelect,
}: MarketSummaryProps) {
  if (error) return <StatePanel kind="error" message={error} />;
  if (loading && !snapshot) return <SummarySkeleton />;
  if (!snapshot) return <StatePanel kind="empty" />;

  return (
    <div className="grid grid--summary">
      {UNDERLYING_LIST.map((config) => (
        <IndexCard
          key={config.symbol}
          quote={snapshot.quotes[config.symbol]}
          onSelect={onSelect}
          selected={selectedSymbol === config.symbol}
        />
      ))}
      <VixCard vix={snapshot.vix} />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid--summary" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="index-card">
          <div className="skeleton" style={{ height: 12, width: "45%" }} />
          <div className="skeleton" style={{ height: 28, width: "70%" }} />
          <div className="skeleton" style={{ height: 10, width: "100%" }} />
          <div className="skeleton" style={{ height: 40, width: "100%" }} />
        </div>
      ))}
    </div>
  );
}
