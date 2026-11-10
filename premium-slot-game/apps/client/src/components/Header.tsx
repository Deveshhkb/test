import { formatCredits } from '../services/format';
import { useCountUp } from '../hooks/useCountUp';
import { useBonusStore } from '../stores/bonusStore';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import { runtime } from '../game/runtime';
import { FreeSpinsHeader } from './FreeSpinsHud';
import { IconInfo, IconMenu, IconSound } from './Icons';

export function Logo() {
  return (
    <div className="logo" aria-label="Neon Break">
      <span className="logo-top">NEON</span>
      <span className="logo-bottom">BREAK</span>
    </div>
  );
}

/** Compact top bar like the reference: balance · logo · sound / info / menu. */
export function Header() {
  const display = usePlayerStore((s) => s.displayBalance);
  const connected = usePlayerStore((s) => s.connected);
  const balance = useCountUp(display, 700);
  const muted = useSettingsStore((s) => s.muted);
  const open = useUiStore((s) => s.open);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  if (fs) return <FreeSpinsHeader />;
  return (
    <header className="hud-header">
      <div className="balance">
        <span className="panel-label">
          BALANCE <i className={`conn-dot ${connected ? 'on' : 'off'}`} title={connected ? 'Live connection' : 'Offline – using HTTP'} />
        </span>
        <span className="panel-value" data-testid="balance">
          {formatCredits(balance)}
        </span>
      </div>
      <Logo />
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
        <button type="button" className="icon-btn" aria-label="Game info" data-testid="info-button" onClick={() => open('info')}>
          <IconInfo />
        </button>
        <button type="button" className="icon-btn" aria-label="Menu" data-testid="menu-button" onClick={() => open('menu')}>
          <IconMenu />
        </button>
      </nav>
    </header>
  );
}
