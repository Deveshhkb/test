import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { gameController } from '@/services/GameController';
import { soundManager } from '@/services/SoundManager';
import { formatCredits } from '@/utils/format';
import { GamePhase } from '@/types';
import { AUTO_SPIN_OPTIONS, BET_LEVELS, COIN_VALUES } from '@/constants';

/** Bottom control bar: balance / bet / win readouts, bet & coin steppers,
 *  spin, turbo and auto-spin controls. */
export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const balance = useGameStore((s) => s.balance);
  const win = useGameStore((s) => s.win);
  const betIndex = useGameStore((s) => s.betIndex);
  const coinIndex = useGameStore((s) => s.coinIndex);
  const autoSpins = useGameStore((s) => s.autoSpinsRemaining);
  const freeSpins = useGameStore((s) => s.freeSpinsRemaining);
  const inFreeSpins = useGameStore((s) => s.inFreeSpins);
  const totalBet = useGameStore((s) => s.totalBet());

  const turbo = useSettingsStore((s) => s.turbo);
  const setTurbo = useSettingsStore((s) => s.setTurbo);

  const [autoMenuOpen, setAutoMenuOpen] = useState(false);

  const idle = phase === GamePhase.Idle;
  const canSpin = idle && !inFreeSpins;
  const betLocked = !canSpin || autoSpins > 0;

  const click = (fn: () => void) => () => {
    soundManager.play('button');
    fn();
  };

  const spin = () => {
    soundManager.play('button');
    void gameController.requestSpin();
  };

  // Keyboard: space = spin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (useGameStore.getState().phase === GamePhase.Idle) {
          void gameController.requestSpin();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const store = useGameStore.getState();

  return (
    <div className="hud">
      <div className="hud-cell readout">
        <span className="label">BALANCE</span>
        <span className="value">{formatCredits(balance)}</span>
      </div>

      <div className="hud-cell bet-controls">
        <span className="label">BET LEVEL</span>
        <div className="stepper">
          <button disabled={betLocked || betIndex === 0} onClick={click(store.betDown)}>
            −
          </button>
          <span>{BET_LEVELS[betIndex]}</span>
          <button
            disabled={betLocked || betIndex === BET_LEVELS.length - 1}
            onClick={click(store.betUp)}
          >
            +
          </button>
        </div>
      </div>

      <div className="hud-cell bet-controls">
        <span className="label">COIN VALUE</span>
        <div className="stepper">
          <button disabled={betLocked || coinIndex === 0} onClick={click(store.coinDown)}>
            −
          </button>
          <span>{COIN_VALUES[coinIndex].toFixed(2)}</span>
          <button
            disabled={betLocked || coinIndex === COIN_VALUES.length - 1}
            onClick={click(store.coinUp)}
          >
            +
          </button>
        </div>
      </div>

      <div className="hud-cell readout">
        <span className="label">TOTAL BET</span>
        <span className="value">{formatCredits(totalBet)}</span>
      </div>

      <div className="spin-cluster">
        <button
          className={`side-btn ${turbo ? 'active' : ''}`}
          onClick={click(() => setTurbo(!turbo))}
          aria-label="Turbo spin"
        >
          ⚡<small>TURBO</small>
        </button>

        <button
          className={`spin-btn ${!idle ? 'spinning' : ''}`}
          disabled={!idle || inFreeSpins}
          onClick={spin}
          aria-label="Spin"
        >
          {inFreeSpins || freeSpins > 0 ? `FS ${freeSpins}` : idle ? 'SPIN' : '···'}
        </button>

        <div className="auto-wrap">
          {autoSpins > 0 ? (
            <button
              className="side-btn active"
              onClick={click(store.stopAutoSpin)}
              aria-label="Stop auto spin"
            >
              ⏹<small>{autoSpins === Infinity ? '∞' : autoSpins}</small>
            </button>
          ) : (
            <button
              className="side-btn"
              disabled={!canSpin}
              onClick={click(() => setAutoMenuOpen((o) => !o))}
              aria-label="Auto spin"
            >
              🔁<small>AUTO</small>
            </button>
          )}
          {autoMenuOpen && autoSpins === 0 && (
            <div className="auto-menu">
              {AUTO_SPIN_OPTIONS.map((n) => (
                <button
                  key={String(n)}
                  onClick={click(() => {
                    setAutoMenuOpen(false);
                    gameController.startAutoSpin(n);
                  })}
                >
                  {n === Infinity ? '∞' : n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hud-cell readout win-readout">
        <span className="label">WIN</span>
        <span className={`value ${win > 0 ? 'winning' : ''}`}>
          {win > 0 ? formatCredits(win) : '—'}
        </span>
      </div>
    </div>
  );
}
