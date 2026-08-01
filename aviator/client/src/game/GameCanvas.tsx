import { useEffect, useRef } from 'react';
import { GameEngine } from '@/game/engine/GameEngine';
import { useGameStore } from '@/store/gameStore';

/**
 * The single bridge between React and Pixi.
 *
 * React owns a host <div>; the engine owns everything inside it. Async
 * init is guarded against React 19 StrictMode's mount → unmount → mount
 * cycle: if the effect is cleaned up while `GameEngine.create` is still in
 * flight, the freshly created engine is destroyed instead of leaking a
 * second WebGL context.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let engine: GameEngine | null = null;
    let cancelled = false;
    const unsubscribes: Array<() => void> = [];

    void GameEngine.create({ parent: host }).then((created) => {
      if (cancelled) {
        created.destroy();
        return;
      }
      engine = created;

      const store = useGameStore.getState();
      unsubscribes.push(
        engine.events.on('engine:fps', (fps) => useGameStore.getState().setFps(fps)),
        engine.events.on('phase:changed', ({ to }) => useGameStore.getState().setPhase(to)),
      );
      store.setEngineReady(true);
    });

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribes) unsubscribe();
      engine?.destroy();
      engine = null;
      useGameStore.getState().setEngineReady(false);
    };
  }, []);

  return <div ref={hostRef} className="game-canvas-host" aria-hidden="true" />;
}
