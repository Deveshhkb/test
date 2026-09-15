import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UNDERLYING_LIST } from "../../config/underlyings";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { symbolChanged } from "../../store/slices/optionChainSlice";
import { toggleTheme } from "../../store/slices/uiSlice";
import {
  selectActiveDataMode,
  selectDataModeMismatch,
  selectMarketStatus,
} from "../../store/selectors";
import type { UnderlyingSymbol } from "../../types/market";
import { formatIstClock } from "../../utils/time";
import { Badge } from "../common/Badge";
import { DataModeBadge } from "../common/DataModeBadge";
import { IconBell, IconMoon, IconSearch, IconSettings, IconSun } from "../common/Icon";
import { MarketStatusPill } from "./MarketStatusPill";
import { Wordmark } from "./Wordmark";

/**
 * Global header: identity, session status, search, alerts, theme and settings.
 * The IST clock ticks locally; the session phase comes from the market-status
 * utility so it stays correct across midnight, weekends and holidays.
 */
export function MarketHeader() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectMarketStatus);
  const theme = useAppSelector((state) => state.ui.theme);
  const dataMode = useAppSelector(selectActiveDataMode);
  const dataModeMismatch = useAppSelector(selectDataModeMismatch);
  const [clock, setClock] = useState(() => formatIstClock());
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(formatIstClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <Link to="/" aria-label="OptionPulse home">
          <Wordmark />
        </Link>
        <MarketStatusPill status={status} />
        <span className="app-header__hide-sm">
          <Badge tone="neutral" title="Indian Standard Time">
            <span className="num">{clock}</span> IST
          </Badge>
        </span>
      </div>

      <div className="app-header__spacer" />

      <div className="app-header__actions">
        <span className="app-header__hide-sm">
          <DataModeBadge mode={dataMode} />
        </span>
        {dataModeMismatch && (
          <Badge
            tone="warn"
            title="This build is configured for a different data mode than the data it is actually receiving. The badge shows what the data really is."
          >
            Config mismatch
          </Badge>
        )}

        {searchOpen ? (
          <SearchBox
            inputRef={searchRef}
            onClose={() => setSearchOpen(false)}
            onSelect={(symbol) => {
              dispatch(symbolChanged(symbol));
              setSearchOpen(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Search instruments"
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch size={17} />
          </button>
        )}

        <Link to="/alerts" className="btn btn--icon" aria-label="Alerts">
          <IconBell size={17} />
        </Link>

        <button
          type="button"
          className="btn btn--icon"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => dispatch(toggleTheme())}
        >
          {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>

        <Link to="/settings" className="btn btn--icon" aria-label="Settings">
          <IconSettings size={17} />
        </Link>
      </div>
    </header>
  );
}

function SearchBox({
  inputRef,
  onClose,
  onSelect,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSelect: (symbol: UnderlyingSymbol) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = UNDERLYING_LIST.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="input-field"
        style={{ width: 200 }}
        placeholder="Search index…"
        value={query}
        aria-label="Search instruments"
        onChange={(event) => setQuery(event.target.value)}
        onBlur={() => window.setTimeout(onClose, 120)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter" && matches[0]) onSelect(matches[0].symbol);
        }}
      />
      {query.length > 0 && (
        <ul
          className="panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 220,
            zIndex: 50,
            padding: 4,
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {matches.length === 0 && (
            <li className="inline-note" style={{ padding: "8px 10px" }}>
              No matching instrument.
            </li>
          )}
          {matches.map((item) => (
            <li key={item.symbol}>
              <button
                type="button"
                className="rail-link"
                style={{ width: "100%" }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(item.symbol)}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
