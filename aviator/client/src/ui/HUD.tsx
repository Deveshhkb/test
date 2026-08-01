import { useTranslation } from 'react-i18next';
import { GamePhase } from '@aviator/shared';
import { useGameStore } from '@/store/gameStore';
import { useBreakpoint, useOrientation } from '@/hooks/useViewport';

/**
 * Glassmorphism HUD above the canvas. Everything it shows comes from the
 * Zustand stores (engine → store → React, one-way); layout adapts through
 * data attributes the stylesheet keys on, so breakpoint/orientation
 * changes cost one attribute swap, not a re-mount.
 */
export function HUD() {
  const { t } = useTranslation();
  const phase = useGameStore((s) => s.phase);
  const countdown = useGameStore((s) => s.countdown);
  const lastCrash = useGameStore((s) => s.lastCrash);
  const fps = useGameStore((s) => s.fps);
  const engineReady = useGameStore((s) => s.engineReady);
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();

  if (!engineReady) {
    return (
      <div
        className="hud-overlay"
        data-breakpoint={breakpoint}
        data-orientation={orientation}
        role="status"
      >
        <div className="glass-panel hud-loading">{t('app.loading')}</div>
      </div>
    );
  }

  const statusText =
    phase === GamePhase.Countdown && countdown !== null
      ? t('hud.startingIn', { seconds: countdown })
      : t(`hud.phase.${phase}`);

  const showLastCrash =
    lastCrash !== null && (phase === GamePhase.Crash || phase === GamePhase.Result);

  return (
    <div className="hud-overlay" data-breakpoint={breakpoint} data-orientation={orientation}>
      <div className="glass-panel hud-status" role="status" aria-live="polite">
        <span className="hud-phase">{statusText}</span>
        {showLastCrash ? (
          <span className="hud-crash">
            {t('hud.flewAwayAt', { multiplier: lastCrash.toFixed(2) })}
          </span>
        ) : null}
        <span className="hud-fps">{t('hud.fps', { value: fps })}</span>
      </div>
    </div>
  );
}
