import { formatCredits } from '../services/format';
import { useBonusStore } from '../stores/bonusStore';

/** Free spins counters shown in the control bar while the feature is active. */
export function FreeSpinsPanels() {
  const fs = useBonusStore((s) => s.freeSpins);
  if (!fs) return null;
  return (
    <>
      <div className="panel fs-panel" data-testid="free-spins-hud">
        <span className="panel-label">FREE SPINS</span>
        <span className="panel-value fs-value" data-testid="free-spins-remaining">
          {fs.remaining}
          <small> / {fs.total}</small>
        </span>
      </div>
      <div className="panel fs-panel fs-mult">
        <span className="panel-label">MULTIPLIER</span>
        <span className="panel-value fs-value">x{fs.multiplier}</span>
      </div>
      <div className="panel fs-panel fs-total">
        <span className="panel-label">FS TOTAL</span>
        <span className="panel-value">{formatCredits(fs.totalWin)}</span>
      </div>
    </>
  );
}

/** Replaces the logo with the FREE SPINS title during the feature. */
export function FreeSpinsTitle() {
  return (
    <div className="fs-title" data-testid="free-spins-title">
      FREE SPINS
    </div>
  );
}
