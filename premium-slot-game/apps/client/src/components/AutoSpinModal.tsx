import { AUTO_SPIN_OPTIONS, useSettingsStore } from '../stores/settingsStore';
import { useUiStore } from '../stores/uiStore';
import { runtime } from '../game/runtime';
import { Modal } from './Modal';

export function AutoSpinModal() {
  const close = useUiStore((s) => s.close);
  return (
    <Modal title="AUTO SPIN" testId="auto-modal">
      <p className="muted">Number of automatic spins. Auto spin stops on insufficient balance{useSettingsStore.getState().stopAutoOnFeature ? ' and when a feature triggers' : ''}.</p>
      <div className="auto-grid">
        {AUTO_SPIN_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className="pill-btn"
            data-testid={`auto-${Number.isFinite(n) ? n : 'inf'}`}
            onClick={() => {
              close();
              useSettingsStore.getState().startAuto(n);
              void runtime.controller?.spin();
            }}
          >
            {Number.isFinite(n) ? n : '∞'}
          </button>
        ))}
      </div>
    </Modal>
  );
}
