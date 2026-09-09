import type { DebugSnapshot } from '../../game/types';

interface DebugPanelProps {
  snapshot: DebugSnapshot | null;
}

function row(label: string, value: string) {
  return (
    <div className="debug__row" key={label}>
      <span className="debug__key">{label}</span>
      <span className="debug__value">{value}</span>
    </div>
  );
}

/**
 * Sampled five times a second from the game loop, so opening the panel does not
 * turn the render loop into a React render loop.
 */
export default function DebugPanel({ snapshot }: DebugPanelProps) {
  if (!snapshot) return null;
  const s = snapshot;

  return (
    <div className="debug">
      <div className="debug__title">Debug</div>
      {row('fps', `${s.fps.toFixed(1)}${s.clamped ? ' (clamped)' : ''}`)}
      {row('sim delta', `${(s.simDelta * 1000).toFixed(1)} ms`)}
      {row('state', `${s.state} (${s.elapsed.toFixed(2)}s)`)}
      {row('phase progress', `${(s.progress * 100).toFixed(0)}%`)}
      {row('camera zoom', `${s.zoom.toFixed(2)}x`)}
      {row('drum ω', `${s.drumOmega.toFixed(2)} rad/s`)}
      {row('drum angle', `${((s.drumAngle * 180) / Math.PI).toFixed(0)}°`)}
      {row('arm angle', `${((s.armAngle * 180) / Math.PI).toFixed(0)}°`)}
      {row('balls visible', String(s.activeBalls))}
      {row('contacts', String(s.contacts))}
      {row('physics substeps', String(s.subSteps))}
      {row('result', s.winnerNumber === null ? '—' : String(s.winnerNumber))}
      {row('winner pos', `${s.winnerX.toFixed(0)}, ${s.winnerY.toFixed(0)}`)}
      {row('winner vel', `${s.winnerVx.toFixed(0)}, ${s.winnerVy.toFixed(0)}`)}
    </div>
  );
}
