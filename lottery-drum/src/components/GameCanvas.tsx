import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

interface GameCanvasProps {
  /** Called once the Pixi application is live, and again with null on teardown. */
  onReady: (game: Game | null) => void;
}

/**
 * Mounts the Pixi application into a DOM host. This component renders exactly
 * once; the game loop never touches React state, so no frame causes a re-render.
 */
export default function GameCanvas({ onReady }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new Game();
    let cancelled = false;

    void game.init(host).then(() => {
      if (cancelled) return;
      readyRef.current(game);
    });

    return () => {
      cancelled = true;
      readyRef.current(null);
      game.destroy();
    };
  }, []);

  return <div className="game-canvas" ref={hostRef} />;
}
