import { useCallback } from "react";
import { Panel } from "../components/common/Panel";
import { StatePanel } from "../components/common/StatePanel";
import { OptionChainFilters } from "../components/optionChain/OptionChainFilters";
import {
  OptionChainLegend,
  OptionChainTable,
} from "../components/optionChain/OptionChainTable";
import { OptionChainToolbar } from "../components/optionChain/OptionChainToolbar";
import {
  MaxPainCard,
  OiAnalysisCard,
  PcrCard,
  SupportResistanceCard,
} from "../components/optionChain/OptionAnalytics";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectAtmStrike,
  selectChain,
  selectChainAnalytics,
  selectChainStatus,
  selectChainSymbol,
  selectCustomRange,
  selectExpiries,
  selectMarketStatus,
  selectSelectedContract,
  selectSelectedExpiry,
  selectStrikeFilter,
  selectVisibleChainRows,
} from "../store/selectors";
import {
  contractSelected,
  customRangeChanged,
  expiryChanged,
  filterChanged,
  symbolChanged,
} from "../store/slices/optionChainSlice";
import type { UnderlyingSymbol } from "../types/market";
import type { OptionType } from "../types/options";

export function OptionChainPage() {
  const dispatch = useAppDispatch();
  const symbol = useAppSelector(selectChainSymbol);
  const expiry = useAppSelector(selectSelectedExpiry);
  const expiries = useAppSelector(selectExpiries);
  const chain = useAppSelector(selectChain);
  const chainStatus = useAppSelector(selectChainStatus);
  const error = useAppSelector((state) => state.optionChain.error);
  const analytics = useAppSelector(selectChainAnalytics);
  const atmStrike = useAppSelector(selectAtmStrike);
  const rows = useAppSelector(selectVisibleChainRows);
  const filter = useAppSelector(selectStrikeFilter);
  const customRange = useAppSelector(selectCustomRange);
  const selected = useAppSelector(selectSelectedContract);
  const marketStatus = useAppSelector(selectMarketStatus);
  const analyticsCollapsed = useAppSelector((state) => state.ui.analyticsCollapsed);

  const handleSelectContract = useCallback(
    (strike: number, optionType: OptionType) => {
      dispatch(contractSelected({ strike, optionType }));
    },
    [dispatch],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Option chain</h1>
          <p className="page-head__subtitle">
            Calls and puts by strike, with the at-the-money strike derived from spot and the
            configured strike interval.
          </p>
        </div>
      </div>

      <Panel flush>
        <div style={{ padding: "var(--space-3) var(--space-4) 0" }}>
          <OptionChainToolbar
            symbol={symbol}
            expiry={expiry}
            expiries={expiries}
            chain={chain}
            atmStrike={atmStrike}
            marketStatus={marketStatus}
            onSymbolChange={(next: UnderlyingSymbol) => dispatch(symbolChanged(next))}
            onExpiryChange={(next) => dispatch(expiryChanged(next))}
          />
        </div>

        <OptionChainFilters
          filter={filter}
          customRange={customRange}
          onFilterChange={(next) => dispatch(filterChanged(next))}
          onCustomRangeChange={(next) => dispatch(customRangeChanged(next))}
          visibleCount={rows.length}
          totalCount={chain?.rows.length ?? 0}
        />

        {chainStatus === "failed" && <StatePanel kind="error" message={error ?? undefined} />}
        {chainStatus === "loading" && !chain && <StatePanel kind="loading" />}
        {chainStatus !== "failed" && chain && analytics && atmStrike !== null && (
          <>
            <OptionChainTable
              rows={rows}
              spot={chain.spot}
              atmStrike={atmStrike}
              onSelectContract={handleSelectContract}
              selectedStrike={selected?.strike ?? null}
              selectedType={selected?.optionType ?? null}
              resetKey={`${symbol}:${chain.expiry}:${filter}`}
            />
            <OptionChainLegend />
          </>
        )}
      </Panel>

      {analytics && !analyticsCollapsed && (
        <div className="grid grid--thirds">
          <PcrCard analytics={analytics} />
          <MaxPainCard analytics={analytics} />
          <OiAnalysisCard analytics={analytics} />
          <SupportResistanceCard analytics={analytics} />
        </div>
      )}
    </>
  );
}
