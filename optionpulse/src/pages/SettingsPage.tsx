import { Panel } from "../components/common/Panel";
import { Segmented } from "../components/common/Segmented";
import { DataModeBadge } from "../components/common/DataModeBadge";
import { KeyValue } from "../components/common/Metric";
import {
  API_BASE_URL,
  DATA_MODE,
  DATA_MODE_COPY,
  DATA_SOURCE,
  DISCLAIMER,
} from "../config/dataMode";
import { CONTRACT_SPEC_NOTE, UNDERLYING_LIST } from "../config/underlyings";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setDensity, setTheme, type Density, type ThemeName } from "../store/slices/uiSlice";
import { formatPrice } from "../utils/format";

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const density = useAppSelector((state) => state.ui.density);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Settings &amp; data</h1>
          <p className="page-head__subtitle">Appearance, data provenance and contract specs.</p>
        </div>
      </div>

      <div className="grid grid--halves">
        <Panel title="Appearance">
          <div className="kv-list">
            <div className="kv">
              <span className="kv__key">Theme</span>
              <Segmented
                ariaLabel="Theme"
                value={theme}
                onChange={(value) => dispatch(setTheme(value as ThemeName))}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
              />
            </div>
            <div className="kv">
              <span className="kv__key">Table density</span>
              <Segmented
                ariaLabel="Density"
                value={density}
                onChange={(value) => dispatch(setDensity(value as Density))}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Data source" actions={<DataModeBadge mode={DATA_MODE} />}>
          <div className="kv-list">
            <KeyValue label="Mode" value={DATA_MODE_COPY[DATA_MODE].label} />
            <KeyValue
              label="Provider"
              value={DATA_SOURCE === "api" ? "Backend API" : "In-browser mock"}
            />
            <KeyValue label="API base URL" value={API_BASE_URL || "(not configured)"} />
          </div>
          <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
            {DATA_MODE_COPY[DATA_MODE].description} Provider credentials live only on the
            backend; the browser never receives them.
          </p>
        </Panel>
      </div>

      <Panel title="Contract specifications" subtitle={CONTRACT_SPEC_NOTE}>
        <div className="kv-list">
          {UNDERLYING_LIST.map((config) => (
            <KeyValue
              key={config.symbol}
              label={config.name}
              value={`${config.exchange} · strike interval ${formatPrice(config.strikeInterval, 0)} · lot ${config.lotSize}`}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Disclaimer">
        <p style={{ fontSize: "var(--text-sm)" }}>{DISCLAIMER}</p>
        <p className="inline-note" style={{ marginTop: "var(--space-2)" }}>
          OptionPulse is an analysis tool. It does not place orders, and it makes no claim to
          predict market outcomes.
        </p>
      </Panel>
    </>
  );
}
