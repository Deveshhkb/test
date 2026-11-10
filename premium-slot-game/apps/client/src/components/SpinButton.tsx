import { useEffect, useRef, useState } from 'react';
import { runtime } from '../game/runtime';
import { useSpinButtonState } from '../hooks/useSpinButtonState';
import { useSettingsStore } from '../stores/settingsStore';
import { IconSpin } from './Icons';

/**
 * Premium circular spin button. States: idle, hover, pressed (CSS), spinning, disabled,
 * auto (with counter), turbo indicator and the special lucky-spin glow.
 */
export function SpinButton() {
  const state = useSpinButtonState();
  const auto = useSettingsStore((s) => s.autoSpinsRemaining);
  const turbo = useSettingsStore((s) => s.turbo);
  const [pressed, setPressed] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    setPressed(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPressed(false), 140);
    if (state === 'auto') {
      useSettingsStore.getState().stopAuto();
      return;
    }
    if (state === 'spinning' || state === 'lucky') {
      runtime.controller?.quickStop();
      return;
    }
    void runtime.controller?.spin();
  };

  const label = state === 'auto' ? 'Stop auto spin' : state === 'spinning' || state === 'lucky' ? 'Quick stop' : 'Spin';
  return (
    <button
      type="button"
      className={`spin-btn spin-${state}${pressed ? ' is-pressed' : ''}${turbo ? ' is-turbo' : ''}`}
      data-state={state}
      data-testid="spin-button"
      aria-label={label}
      aria-disabled={state === 'disabled'}
      disabled={state === 'disabled'}
      onClick={onClick}
    >
      <span className="spin-ring" />
      <span className="spin-energy" />
      <span className="spin-core">
        {state === 'auto' ? <span className="spin-auto-count">{Number.isFinite(auto) ? auto : '∞'}</span> : <IconSpin className="spin-icon" width={74} height={74} />}
      </span>
      {state === 'lucky' && <span className="spin-lucky-tag">LUCKY</span>}
    </button>
  );
}
