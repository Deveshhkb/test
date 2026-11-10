import { formatCredits } from '../services/format';
import { useCountUp } from '../hooks/useCountUp';
import { useBetStore } from '../stores/betStore';
import { useBonusStore } from '../stores/bonusStore';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import { runtime } from '../game/runtime';
import { IconBolt, IconInfo } from './Icons';
import { SpinButton } from './SpinButton';
import { FreeSpinsTotal } from './FreeSpinsHud';

function useBetLocked() {
  const phase = useGameStore((s) => s.phase);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  const auto = useSettingsStore((s) => s.autoSpinsRemaining);
  const ready = useGameStore((s) => s.ready);
  return !ready || fs || auto > 0 || phase !== 'IDLE';
}

const click = () => runtime.app?.audio.play('click');

export function BetPanel() {
  const bet = useBetStore((s) => s.bet);
  const index = useBetStore((s) => s.index);
  const levels = useBetStore((s) => s.levels);
  const locked = useBetLocked();
  return (
    <div className="panel bet-panel">
      <button type="button" className="round-btn" aria-label="Decrease bet" data-testid="bet-minus" disabled={locked || index === 0} onClick={() => { click(); useBetStore.getState().decrease(); }}>
        −
      </button>
      <div className="bet-value">
        <span className="panel-label">BET</span>
        <span className="panel-value" data-testid="bet-value">{formatCredits(bet)}</span>
      </div>
      <button type="button" className="round-btn" aria-label="Increase bet" data-testid="bet-plus" disabled={locked || index === levels.length - 1} onClick={() => { click(); useBetStore.getState().increase(); }}>
        +
      </button>
    </div>
  );
}

export function WinPanel() {
  const roundWin = useGameStore((s) => s.roundWin);
  const value = useCountUp(roundWin, 500);
  return (
    <div className={`panel win-panel${roundWin > 0 ? ' has-win' : ''}`}>
      <span className="panel-label">WIN</span>
      <span className="panel-value" data-testid="win-value">{formatCredits(value)}</span>
    </div>
  );
}

export function AutoButton() {
  const auto = useSettingsStore((s) => s.autoSpinsRemaining);
  const open = useUiStore((s) => s.open);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  const active = auto > 0;
  return (
    <button
      type="button"
      className={`pill-btn auto-btn${active ? ' is-active' : ''}`}
      data-testid="auto-button"
      disabled={fs}
      onClick={() => {
        click();
        if (active) useSettingsStore.getState().stopAuto();
        else open('auto');
      }}
    >
      {active ? (
        <>
          <span>STOP</span>
          <small>{Number.isFinite(auto) ? auto : '∞'}</small>
        </>
      ) : (
        'AUTO'
      )}
    </button>
  );
}

export function TurboButton() {
  const turbo = useSettingsStore((s) => s.turbo);
  return (
    <button type="button" className={`pill-btn turbo-btn${turbo ? ' is-active' : ''}`} aria-pressed={turbo} data-testid="turbo-button" onClick={() => { click(); useSettingsStore.getState().toggleTurbo(); }}>
      <IconBolt width={22} height={22} />
      <span>TURBO</span>
    </button>
  );
}

export function MaxBetButton() {
  const locked = useBetLocked();
  return (
    <button type="button" className="pill-btn max-btn" data-testid="max-bet" disabled={locked} onClick={() => { click(); useBetStore.getState().max(); }}>
      MAX<br />BET
    </button>
  );
}

export function ControlBar() {
  const open = useUiStore((s) => s.open);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  if (fs)
    return (
      <div className="control-bar is-free-spins">
        <FreeSpinsTotal />
        <div className="spin-slot">
          <SpinButton />
        </div>
        <TurboButton />
        <WinPanel />
      </div>
    );
  return (
    <div className="control-bar">
      <button type="button" className="icon-btn info-btn" aria-label="Paytable" onClick={() => open('paytable')}>
        <IconInfo />
      </button>
      <BetPanel />
      <MaxBetButton />
      <div className="spin-slot">
        <SpinButton />
      </div>
      <AutoButton />
      <TurboButton />
      <WinPanel />
    </div>
  );
}
