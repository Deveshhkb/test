import { DATA_MODE, DATA_MODE_COPY, DISCLAIMER } from "../../config/dataMode";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <p className="app-footer__disclaimer">{DISCLAIMER}</p>
      <p>
        OptionPulse &middot; {DATA_MODE_COPY[DATA_MODE].label} &middot; Analysis only, no order
        execution.
      </p>
    </footer>
  );
}
