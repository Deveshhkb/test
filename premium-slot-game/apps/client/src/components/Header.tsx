import { formatCredits } from '../services/format';
import { useCountUp } from '../hooks/useCountUp';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import { runtime } from '../game/runtime';
import { useBonusStore } from '../stores/bonusStore';
import { FreeSpinsTitle } from './FreeSpinsHud';
import { IconHistory, IconInfo, IconMenu, IconSettings, IconSound, IconTable } from './Icons';

export function Logo() {
  return (
    <div className="logo" aria-label="Neon Break">
      <span className="logo-top">NEON</span>
      <span className="logo-bottom">BREAK</span>
    </div>
  );
}

export function Header() {
  const display = usePlayerStore((s) => s.displayBalance);
  const connected = usePlayerStore((s) => s.connected);
  const balance = useCountUp(display, 700);
  const muted = useSettingsStore((s) => s.muted);
  const open = useUiStore((s) => s.open);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  return (
    <header className="hud-header">
      <div className="panel balance-panel">
        <span className="panel-label">
          BALANCE <i className={`conn-dot ${connected ? 'on' : 'off'}`} title={connected ? 'Live connection' : 'Offline – using HTTP'} />
        </span>
        <span className="panel-value" data-testid="balance">
          {formatCredits(balance)}
        </span>
      </div>
      {fs ? <FreeSpinsTitle /> : <Logo />}
      <nav className="header-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={muted ? 'Unmute' : 'Mute'}
          data-testid="sound-toggle"
          onClick={() => {
            runtime.controller?.unlockAudio();
            useSettingsStore.getState().toggleMute();
          }}
        >
          <IconSound muted={muted} />
        </button>
        <button type="button" className="icon-btn hide-portrait" aria-label="Paytable" onClick={() => open('paytable')}>
          <IconTable />
        </button>
        <button type="button" className="icon-btn hide-portrait" aria-label="History" onClick={() => open('history')}>
          <IconHistory />
        </button>
        <button type="button" className="icon-btn hide-portrait" aria-label="Settings" onClick={() => open('settings')}>
          <IconSettings />
        </button>
        <button type="button" className="icon-btn" aria-label="Game info" onClick={() => open('info')}>
          <IconInfo />
        </button>
        <button type="button" className="icon-btn" aria-label="Menu" data-testid="menu-button" onClick={() => open('menu')}>
          <IconMenu />
        </button>
      </nav>
    </header>
  );
}
