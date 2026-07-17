import { useState } from 'react';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsPanel } from './SettingsPanel';
import { HelpPanel } from './HelpPanel';
import { HistoryPanel } from './HistoryPanel';
import { soundManager } from '@/services/SoundManager';

/** Top-right utility bar: menu, sound, history, help, settings, fullscreen. */
export function TopBar() {
  const [openPanel, setOpenPanel] = useState<'settings' | 'help' | 'history' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isFullscreen, toggle } = useFullscreen();
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const muted = soundVolume === 0 && musicVolume === 0;

  const click = (fn: () => void) => () => {
    soundManager.play('button');
    fn();
  };

  const toggleMute = () => {
    if (muted) {
      setSoundVolume(0.8);
      setMusicVolume(0.5);
    } else {
      setSoundVolume(0);
      setMusicVolume(0);
    }
  };

  return (
    <>
      <div className="top-bar">
        <button className="icon-btn" onClick={click(() => setMenuOpen((o) => !o))} aria-label="Menu">
          ☰
        </button>
        {menuOpen && (
          <div className="menu-drawer">
            <button onClick={click(() => { setOpenPanel('settings'); setMenuOpen(false); })}>
              ⚙ Settings
            </button>
            <button onClick={click(() => { setOpenPanel('history'); setMenuOpen(false); })}>
              🕘 History
            </button>
            <button onClick={click(() => { setOpenPanel('help'); setMenuOpen(false); })}>
              ？ Paytable & Help
            </button>
          </div>
        )}
        <button className="icon-btn" onClick={click(toggleMute)} aria-label="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" onClick={click(toggle)} aria-label="Fullscreen">
          {isFullscreen ? '🗗' : '⛶'}
        </button>
      </div>

      <SettingsPanel open={openPanel === 'settings'} onClose={() => setOpenPanel(null)} />
      <HelpPanel open={openPanel === 'help'} onClose={() => setOpenPanel(null)} />
      <HistoryPanel open={openPanel === 'history'} onClose={() => setOpenPanel(null)} />
    </>
  );
}
