import { formatCredits } from '../services/format';
import { useCountUp } from '../hooks/useCountUp';
import { useBonusStore } from '../stores/bonusStore';
import { useGameStore } from '../stores/gameStore';

/** Free spins header (reference panel 8): spins left · FREE SPINS · multiplier, above the reels. */
export function FreeSpinsHeader() {
  const fs = useBonusStore((s) => s.freeSpins);
  return (
    <header className="hud-header fs-header" data-testid="free-spins-hud">
      <div className="fs-box">
        <span className="fs-box-label">FREE SPINS</span>
        <span className="fs-box-value" data-testid="free-spins-remaining">
          {fs?.remaining ?? 0}
        </span>
      </div>
      <div className="fs-title" data-testid="free-spins-title">
        <span>FREE SPINS</span>
        <i className="fs-title-bar" />
      </div>
      <div className="fs-box">
        <span className="fs-box-label">MULTIPLIER</span>
        <span className="fs-box-value">×{fs?.multiplier ?? 1}</span>
      </div>
    </header>
  );
}

/** Gold "TOTAL WIN" plate shown under the reels during free spins. */
export function FreeSpinsTotal() {
  const fs = useBonusStore((s) => s.freeSpins);
  const roundWin = useGameStore((s) => s.roundWin);
  const phase = useGameStore((s) => s.phase);
  // include the running round win while a free spin is being presented
  const live = (fs?.totalWin ?? 0) + (phase !== 'IDLE' && phase !== 'FREE_SPINS' ? roundWin : 0);
  const value = useCountUp(live, 500);
  return (
    <div className="fs-total-plate" data-testid="free-spins-total">
      <span className="fs-total-label">TOTAL WIN</span>
      <span className="fs-total-value">{formatCredits(value)}</span>
    </div>
  );
}
