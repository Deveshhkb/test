import { useEffect, useImperativeHandle, useRef, forwardRef, type CSSProperties } from "react";

import { BaccaratGame } from "../index";
import type { BaccaratGameOptions } from "../game/BaccaratGame";
import type { DeepPartial, GameConfig } from "../game/Config";
import type { GameEventMap } from "../game/events";

export interface BaccaratGameHandle {
  readonly game: BaccaratGame | null;
  pause(): void;
  resume(): void;
  reset(): void;
  resize(): void;
  updateConfig(partial: DeepPartial<GameConfig>): void;
}

export interface BaccaratGameViewProps {
  config?: DeepPartial<GameConfig>;
  options?: BaccaratGameOptions;
  className?: string;
  style?: CSSProperties;
  onReady?: (game: BaccaratGame) => void;
  onError?: (error: GameEventMap["game:error"]) => void;
  onRoundSettled?: (payload: GameEventMap["round:settled"]) => void;
  onBalanceChanged?: (payload: GameEventMap["balance:changed"]) => void;
}

const FILL: CSSProperties = { position: "relative", width: "100%", height: "100%" };

/**
 * React wrapper.
 *
 * The entire integration: one ref, one effect, one `destroy()`. No React state
 * drives the game and no game state drives React re-renders — data flows out
 * through callbacks only, so a busy table never re-renders the host tree.
 *
 * `config` is deliberately *not* in the effect's dependency list; changing it
 * calls `updateConfig()` instead of rebuilding the renderer.
 */
export const BaccaratGameView = forwardRef<BaccaratGameHandle, BaccaratGameViewProps>(
  function BaccaratGameView(props, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<BaccaratGame | null>(null);
    // Keep the latest callbacks without re-running the boot effect.
    const propsRef = useRef(props);
    propsRef.current = props;

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      let disposed = false;
      const game = new BaccaratGame();
      gameRef.current = game;

      const unsubscribes = [
        game.on("game:error", (payload) => propsRef.current.onError?.(payload)),
        game.on("round:settled", (payload) => propsRef.current.onRoundSettled?.(payload)),
        game.on("balance:changed", (payload) => propsRef.current.onBalanceChanged?.(payload)),
      ];

      void game
        .init(host, propsRef.current.config, propsRef.current.options)
        .then(() => {
          // StrictMode double-invokes effects in development; bail if the
          // cleanup already ran while init was in flight.
          if (disposed) return;
          propsRef.current.onReady?.(game);
        })
        .catch(() => undefined);

      return () => {
        disposed = true;
        for (const unsubscribe of unsubscribes) unsubscribe();
        game.destroy();
        gameRef.current = null;
      };
    }, []);

    // Config changes are applied in place rather than remounting the canvas.
    useEffect(() => {
      if (props.config) gameRef.current?.updateConfig(props.config);
    }, [props.config]);

    useImperativeHandle(
      ref,
      (): BaccaratGameHandle => ({
        get game() {
          return gameRef.current;
        },
        pause: () => gameRef.current?.pause(),
        resume: () => gameRef.current?.resume(),
        reset: () => gameRef.current?.reset(),
        resize: () => gameRef.current?.resize(),
        updateConfig: (partial) => gameRef.current?.updateConfig(partial),
      }),
      [],
    );

    return (
      <div
        ref={hostRef}
        className={props.className}
        style={{ ...FILL, ...props.style }}
        data-testid="baccarat-game"
      />
    );
  },
);

export default BaccaratGameView;
