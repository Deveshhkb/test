import { Logo } from './Header';

export function LoadingScreen({ ready, error, onStart }: { ready: boolean; error: string | null; onStart(): void }) {
  return (
    <div className="loading-screen" data-testid="loading-screen">
      <Logo />
      <p className="loading-sub">PREMIUM CYBERPUNK 6×5 • 15,625 WAYS</p>
      {error ? (
        <div className="loading-error">
          <p>{error}</p>
          <button type="button" className="pill-btn" onClick={() => window.location.reload()}>
            RETRY
          </button>
        </div>
      ) : ready ? (
        <button type="button" className="start-btn" data-testid="start-button" onClick={onStart}>
          TAP TO PLAY
        </button>
      ) : (
        <div className="loader">
          <span />
          <span />
          <span />
        </div>
      )}
      <p className="loading-legal">Virtual credits demo • no real-money gambling</p>
    </div>
  );
}
