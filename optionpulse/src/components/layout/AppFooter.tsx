import { DATA_MODE_COPY, DISCLAIMER } from "../../config/dataMode";
import { useAppSelector } from "../../store/hooks";
import { selectActiveDataMode } from "../../store/selectors";

export function AppFooter() {
  const dataMode = useAppSelector(selectActiveDataMode);
  return (
    <footer className="app-footer">
      <p className="app-footer__disclaimer">{DISCLAIMER}</p>
      <p>
        OptionPulse &middot; {DATA_MODE_COPY[dataMode].label} &middot; Analysis only, no order
        execution.
      </p>
    </footer>
  );
}
