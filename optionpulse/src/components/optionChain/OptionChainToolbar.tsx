import { UNDERLYING_LIST } from "../../config/underlyings";
import type { MarketStatus, UnderlyingSymbol } from "../../types/market";
import type { ExpiryInfo, OptionChain } from "../../types/options";
import { formatPrice } from "../../utils/format";
import { formatIstTimestamp } from "../../utils/time";
import { DataModeBadge } from "../common/DataModeBadge";
import { Metric } from "../common/Metric";
import { SelectField } from "../common/SelectField";
import { MarketStatusPill } from "../layout/MarketStatusPill";

interface OptionChainToolbarProps {
  symbol: UnderlyingSymbol;
  expiry: string | null;
  expiries: ExpiryInfo[];
  chain: OptionChain | null;
  atmStrike: number | null;
  marketStatus: MarketStatus;
  onSymbolChange: (symbol: UnderlyingSymbol) => void;
  onExpiryChange: (expiry: string) => void;
}

export function OptionChainToolbar({
  symbol,
  expiry,
  expiries,
  chain,
  atmStrike,
  marketStatus,
  onSymbolChange,
  onExpiryChange,
}: OptionChainToolbarProps) {
  const expiryInfo = expiries.find((item) => item.date === expiry) ?? null;

  return (
    <>
      <div className="toolbar">
        <SelectField
          id="underlying-select"
          label="Underlying"
          value={symbol}
          options={UNDERLYING_LIST.map((item) => ({ value: item.symbol, label: item.name }))}
          onChange={(value) => onSymbolChange(value as UnderlyingSymbol)}
        />
        <SelectField
          id="expiry-select"
          label="Expiry"
          value={expiry ?? ""}
          options={expiries.map((item) => ({
            value: item.date,
            label: `${item.label}${item.isWeekly ? "" : "  · monthly"}`,
          }))}
          onChange={onExpiryChange}
        />
        <div className="app-header__spacer" />
        <MarketStatusPill status={marketStatus} />
        {chain && <DataModeBadge mode={chain.mode} />}
      </div>

      <div className="chain-summary-bar">
        <Metric
          label="Spot"
          value={chain ? formatPrice(chain.spot) : "--"}
          hint={chain ? `Updated ${formatIstTimestamp(chain.timestamp)}` : undefined}
        />
        <Metric
          label="ATM strike"
          value={atmStrike !== null ? formatPrice(atmStrike, 0) : "--"}
          hint="Nearest listed strike to spot"
        />
        <Metric
          label="Expiry"
          value={expiryInfo?.label ?? "--"}
          hint={expiryInfo?.isWeekly ? "Weekly" : "Monthly"}
        />
        <Metric
          label="Days to expiry"
          value={expiryInfo ? `${expiryInfo.daysToExpiry}` : "--"}
          hint="Calendar days"
        />
        <Metric
          label="Strike interval"
          value={chain ? formatPrice(chain.strikeInterval, 0) : "--"}
          hint="From underlying configuration"
        />
      </div>
    </>
  );
}
