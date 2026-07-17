import { Modal } from '@/ui/Modal';
import { useSettingsStore } from '@/store/settingsStore';
import { gameApi } from '@/api/gameApi';
import { soundManager } from '@/services/SoundManager';

interface Props {
  open: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

export function SettingsPanel({ open, onClose }: Props) {
  const settings = useSettingsStore();

  const persist = () => {
    const { musicVolume, soundVolume, turbo, quickSpin, language, quality } =
      useSettingsStore.getState();
    void gameApi
      .settings({ musicVolume, soundVolume, turbo, quickSpin, language, quality })
      .catch(() => undefined);
  };

  return (
    <Modal title="Settings" open={open} onClose={onClose}>
      <div className="settings-grid">
        <label>
          Music volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(e) => {
              settings.setMusicVolume(Number(e.target.value));
              persist();
            }}
          />
        </label>
        <label>
          Sound volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.soundVolume}
            onChange={(e) => {
              settings.setSoundVolume(Number(e.target.value));
              soundManager.play('button');
              persist();
            }}
          />
        </label>
        <label className="toggle-row">
          Turbo spin
          <input
            type="checkbox"
            checked={settings.turbo}
            onChange={(e) => {
              settings.setTurbo(e.target.checked);
              persist();
            }}
          />
        </label>
        <label className="toggle-row">
          Quick spin
          <input
            type="checkbox"
            checked={settings.quickSpin}
            onChange={(e) => {
              settings.setQuickSpin(e.target.checked);
              persist();
            }}
          />
        </label>
        <label>
          Language
          <select
            value={settings.language}
            onChange={(e) => {
              settings.setLanguage(e.target.value);
              persist();
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Graphics quality
          <select
            value={settings.quality}
            onChange={(e) => {
              settings.setQuality(e.target.value as 'low' | 'medium' | 'high');
              persist();
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <p className="hint">Graphics quality changes apply after reload.</p>
      </div>
    </Modal>
  );
}
