/**
 * Reference React wrapper.
 *
 * This file is NOT part of the engine bundle - it is an example you copy into
 * your own application. That is the whole point of the integration story: the
 * engine has no React dependency, and React's only job is to hand it a `div`
 * and tell it when to go away.
 *
 * Everything React-specific lives here. Nothing under `src/` imports React,
 * knows what a hook is, or renders JSX.
 */

import { useEffect, useRef } from 'react';
import {
  createRouletteGame,
  GameEvent,
  type Game,
  type PartialGameConfig,
  type RoundResult,
} from '@casino/roulette-engine';

export interface RouletteTableProps {
  /** Engine configuration. See `GameConfig`. */
  config?: PartialGameConfig;
  /** Fired once the table is playable. */
  onReady?: (game: Game) => void;
  /** Fired at the end of every round with the full result. */
  onRoundResult?: (result: RoundResult) => void;
  className?: string;
}

export function RouletteTable({
  config,
  onReady,
  onRoundResult,
  className,
}: RouletteTableProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  // Callbacks are read through refs so changing them never re-runs the mount
  // effect. A parent that passes an inline arrow function would otherwise tear
  // the whole table down and rebuild it on every render.
  const onReadyRef = useRef(onReady);
  const onRoundResultRef = useRef(onRoundResult);
  onReadyRef.current = onReady;
  onRoundResultRef.current = onRoundResult;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = createRouletteGame(config);
    gameRef.current = game;

    // `cancelled` covers React 18 StrictMode, which mounts, unmounts and
    // remounts effects in development. Without it, the async init would finish
    // after the cleanup had already run and leave an orphaned WebGL context.
    let cancelled = false;

    game.events.on(GameEvent.PAYOUT, (result) => onRoundResultRef.current?.(result));

    void game
      .init(host)
      .then(() => {
        if (cancelled) {
          game.destroy();
          return;
        }
        onReadyRef.current?.(game);
      })
      .catch((error: unknown) => {
        console.error('[RouletteTable] failed to initialise', error);
      });

    return () => {
      cancelled = true;
      game.destroy();
      gameRef.current = null;
    };
    // Mount once. Config changes are pushed through `updateConfig` below rather
    // than by recreating the engine, which would lose the round in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live config updates without a remount.
  useEffect(() => {
    if (config) gameRef.current?.updateConfig(config);
  }, [config]);

  // The engine observes this element with a ResizeObserver, so no explicit
  // `resize()` call is needed - sizing it with CSS is enough.
  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}
    />
  );
}
