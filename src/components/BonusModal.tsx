import { useState } from 'react';
import { Modal } from '@/ui/Modal';
import { useGameStore } from '@/store/gameStore';
import { GamePhase, type BonusResult } from '@/types';
import { gameApi } from '@/api/gameApi';
import { gameController } from '@/services/GameController';
import { soundManager } from '@/services/SoundManager';
import { formatCredits } from '@/utils/format';

/** Pick-a-prize bonus round, shown when 3+ BONUS symbols land. */
export function BonusModal() {
  const phase = useGameStore((s) => s.phase);
  const setBalance = useGameStore((s) => s.setBalance);
  const [result, setResult] = useState<BonusResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (phase !== GamePhase.Bonus) {
    if (result) setResult(null);
    return null;
  }

  const pick = async (index: number) => {
    if (busy || result) return;
    setBusy(true);
    soundManager.play('button');
    try {
      const r = await gameApi.bonus(index);
      setResult(r);
      setBalance(r.balance);
      soundManager.play('bigWin');
    } finally {
      setBusy(false);
    }
  };

  const collect = () => {
    soundManager.play('coin');
    setResult(null);
    gameController.finishBonus();
  };

  return (
    <Modal title="Bonus Game" open dismissable={false}>
      <div className="bonus-game">
        {!result ? (
          <>
            <p>Pick a chest to reveal your prize!</p>
            <div className="bonus-chests">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className="chest-btn"
                  disabled={busy}
                  onClick={() => void pick(i)}
                >
                  🎁
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="bonus-prize">YOU WON</p>
            <p className="bonus-amount">+{formatCredits(result.prize)}</p>
            <div className="bonus-options">
              {result.options.map((o, i) => (
                <span
                  key={i}
                  className={i === result.pickedIndex ? 'picked' : 'not-picked'}
                >
                  {formatCredits(o)}
                </span>
              ))}
            </div>
            <button className="primary-btn" onClick={collect}>
              COLLECT
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
