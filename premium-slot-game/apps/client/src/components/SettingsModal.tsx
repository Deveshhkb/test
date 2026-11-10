import { useSettingsStore } from '../stores/settingsStore';
import { runtime } from '../game/runtime';
import { Modal } from './Modal';

function Slider({ label, value, onChange, testId }: { label: string; value: number; onChange(v: number): void; testId: string }) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} data-testid={testId} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <output>{Math.round(value * 100)}%</output>
    </label>
  );
}

export function SettingsModal() {
  const s = useSettingsStore();
  return (
    <Modal title="SETTINGS" testId="settings">
      <Slider label="Master volume" value={s.masterVolume} testId="vol-master" onChange={(v) => s.setVolume('masterVolume', v)} />
      <Slider label="Music" value={s.musicVolume} testId="vol-music" onChange={(v) => s.setVolume('musicVolume', v)} />
      <Slider label="Sound effects" value={s.sfxVolume} testId="vol-sfx" onChange={(v) => s.setVolume('sfxVolume', v)} />
      <label className="setting-row toggle">
        <span>Mute all</span>
        <input type="checkbox" checked={s.muted} data-testid="mute-toggle" onChange={() => { runtime.controller?.unlockAudio(); s.toggleMute(); }} />
      </label>
      <label className="setting-row toggle">
        <span>Turbo spin</span>
        <input type="checkbox" checked={s.turbo} onChange={() => s.toggleTurbo()} />
      </label>
      <label className="setting-row toggle">
        <span>Stop auto spin on feature</span>
        <input type="checkbox" checked={s.stopAutoOnFeature} onChange={() => s.set({ stopAutoOnFeature: !s.stopAutoOnFeature })} />
      </label>
    </Modal>
  );
}
