import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/gameStore';

/**
 * Minimal glassmorphism HUD proving the engine → store → React pipeline.
 * The full panel system (bets, history, players, …) builds on this pattern:
 * absolutely-positioned DOM layers above the canvas, state from the store.
 */
export function HUD() {
  const { t } = useTranslation();
  const phase = useGameStore((s) => s.phase);
  const fps = useGameStore((s) => s.fps);
  const engineReady = useGameStore((s) => s.engineReady);

  if (!engineReady) {
    return (
      <div className="hud-overlay" role="status">
        <div className="glass-panel hud-loading">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="hud-overlay">
      <div className="glass-panel hud-status" role="status" aria-live="polite">
        <span className="hud-phase">{t(`hud.phase.${phase}`)}</span>
        <span className="hud-fps">{t('hud.fps', { value: fps })}</span>
      </div>
    </div>
  );
}
