import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import Controls from './components/UI/Controls';
import DebugPanel from './components/UI/DebugPanel';
import Hud from './components/UI/Hud';
import type { Game } from './game/Game';
import type { DebugSnapshot, GameState } from './game/types';

/**
 * React owns application state only: which phase the draw is in, the result
 * history, and whether the debug panel is open. Per-frame work stays inside
 * Pixi and crosses the boundary through the game's event bus.
 */
export default function App() {
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>('idle');
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<readonly number[]>([]);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);

  const handleReady = useCallback((game: Game | null) => {
    gameRef.current = game;
    if (!game) return;

    game.bus.on('stateChanged', setState);
    game.bus.on('resultRevealed', setResult);
    game.bus.on('historyChanged', setHistory);
    game.bus.on('debugSnapshot', setSnapshot);
  }, []);

  // Keyboard input is owned by the game; mirror the debug toggle back into React.
  useEffect(() => {
    const id = window.setInterval(() => {
      const game = gameRef.current;
      if (game) setDebugEnabled(game.isDebugEnabled);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const onDraw = useCallback(() => {
    gameRef.current?.startDraw();
  }, []);

  const onReset = useCallback(() => {
    gameRef.current?.reset();
  }, []);

  const onToggleDebug = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const next = !game.isDebugEnabled;
    game.setDebug(next);
    setDebugEnabled(next);
    if (!next) setSnapshot(null);
  }, []);

  return (
    <div className="app">
      <GameCanvas onReady={handleReady} />
      <div className="app__overlay">
        <Hud state={state} result={result} history={history} />
        {debugEnabled && <DebugPanel snapshot={snapshot} />}
        <Controls
          canDraw={state === 'idle'}
          debugEnabled={debugEnabled}
          onDraw={onDraw}
          onReset={onReset}
          onToggleDebug={onToggleDebug}
        />
      </div>
    </div>
  );
}
