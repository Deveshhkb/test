import { useEffect, useRef } from 'react';
import { GamePhase } from '@aviator/shared';
import { GameEngine } from '@/game/engine/GameEngine';
import { useGameStore } from '@/store/gameStore';

/** Multiplier store updates are throttled to 10 Hz — plenty for DOM UI. */
const MULTIPLIER_THROTTLE_MS = 100;

/**
 * The single bridge between React and Pixi.
 *
 * React owns a host <div>; the engine owns everything inside it. Async
 * init is guarded against React 19 StrictMode's mount → unmount → mount
 * cycle: if the effect is cleaned up while `GameEngine.create` is still in
 * flight, the freshly created engine is destroyed instead of leaking a
 * second WebGL context. All event subscriptions are collected and disposed
 * in cleanup — no listener leaks across remounts.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let engine: GameEngine | null = null;
    let cancelled = false;
    let lastMultiplierWrite = 0;
    const unsubscribes: Array<() => void> = [];

    void GameEngine.create({ parent: host })
      .then((created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        engine = created;
        const store = useGameStore.getState;

        unsubscribes.push(
          engine.events.on('engine:fps', (fps) => store().setFps(fps)),
          engine.events.on('phase:changed', ({ to }) => {
            store().setPhase(to);
            if (to !== GamePhase.Countdown) {
              store().setCountdown(null);
            }
          }),
          engine.events.on('round:countdown', (seconds) => store().setCountdown(seconds)),
          engine.events.on('round:multiplier', (multiplier) => {
            const now = performance.now();
            if (now - lastMultiplierWrite >= MULTIPLIER_THROTTLE_MS) {
              lastMultiplierWrite = now;
              store().setMultiplier(multiplier);
            }
          }),
          engine.events.on('round:crashed', ({ multiplier }) => {
            store().setMultiplier(multiplier);
            store().setLastCrash(multiplier);
          }),
        );
        store().setEngineReady(true);
      })
      .catch((error: unknown) => {
        // WebGL unavailable or renderer init failed: surface it instead of
        // a black screen. The HUD keeps showing the loading state; the
        // console carries the diagnostic.
        console.error('[GameCanvas] engine initialisation failed', error);
      });

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribes) unsubscribe();
      unsubscribes.length = 0;
      engine?.destroy();
      engine = null;
      useGameStore.getState().setEngineReady(false);
    };
  }, []);

  return <div ref={hostRef} className="game-canvas-host" aria-hidden="true" />;
}
