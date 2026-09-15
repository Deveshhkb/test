import { useEffect, useState } from "react";
import {
  STRIKE_FILTERS,
  type CustomStrikeRange,
  type StrikeFilterId,
} from "../../services/optionChain/optionChainService";
import { Segmented } from "../common/Segmented";

interface OptionChainFiltersProps {
  filter: StrikeFilterId;
  customRange: CustomStrikeRange;
  onFilterChange: (filter: StrikeFilterId) => void;
  onCustomRangeChange: (range: CustomStrikeRange) => void;
  visibleCount: number;
  totalCount: number;
}

export function OptionChainFilters({
  filter,
  customRange,
  onFilterChange,
  onCustomRangeChange,
  visibleCount,
  totalCount,
}: OptionChainFiltersProps) {
  // Drafts are local component state: a half-typed strike does not belong in
  // the global store.
  const [minDraft, setMinDraft] = useState(customRange.min?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(customRange.max?.toString() ?? "");

  useEffect(() => {
    setMinDraft(customRange.min?.toString() ?? "");
    setMaxDraft(customRange.max?.toString() ?? "");
  }, [customRange.min, customRange.max]);

  const applyCustomRange = () => {
    const min = minDraft.trim() === "" ? null : Number(minDraft);
    const max = maxDraft.trim() === "" ? null : Number(maxDraft);
    onCustomRangeChange({
      min: min !== null && Number.isFinite(min) ? min : null,
      max: max !== null && Number.isFinite(max) ? max : null,
    });
  };

  return (
    <div className="toolbar" style={{ padding: "var(--space-3) var(--space-4)" }}>
      <Segmented
        ariaLabel="Strike filter"
        value={filter}
        onChange={onFilterChange}
        options={STRIKE_FILTERS.map((item) => ({
          value: item.id,
          label: item.label,
          title: item.description,
        }))}
      />

      {filter === "CUSTOM" && (
        <div className="toolbar__group">
          <label className="visually-hidden" htmlFor="strike-min">
            Minimum strike
          </label>
          <input
            id="strike-min"
            className="input-field"
            style={{ width: 110 }}
            inputMode="numeric"
            placeholder="Min strike"
            value={minDraft}
            onChange={(event) => setMinDraft(event.target.value)}
            onBlur={applyCustomRange}
            onKeyDown={(event) => event.key === "Enter" && applyCustomRange()}
          />
          <label className="visually-hidden" htmlFor="strike-max">
            Maximum strike
          </label>
          <input
            id="strike-max"
            className="input-field"
            style={{ width: 110 }}
            inputMode="numeric"
            placeholder="Max strike"
            value={maxDraft}
            onChange={(event) => setMaxDraft(event.target.value)}
            onBlur={applyCustomRange}
            onKeyDown={(event) => event.key === "Enter" && applyCustomRange()}
          />
          <button type="button" className="btn" onClick={applyCustomRange}>
            Apply
          </button>
        </div>
      )}

      <div className="app-header__spacer" />
      <span className="inline-note">
        Showing {visibleCount} of {totalCount} strikes
      </span>
    </div>
  );
}
