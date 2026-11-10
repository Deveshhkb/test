import { useEffect, useRef } from 'react';
import { GameApplication } from '../game/core/GameApplication';
import { GameFlowController } from '../game/core/GameFlowController';
import { runtime } from '../game/runtime';
import { useConfigStore } from '../stores/configStore';
import { useUiStore } from '../stores/uiStore';

/** Hosts the PixiJS canvas and wires the game runtime; cleans everything up on unmount. */
export function GameCanvas({ onReady, onError }: { onReady(): void; onError(msg: string): void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    const app = new GameApplication();
    const controller = new GameFlowController(app);
    (async () => {
      await app.init(host.current!);
      if (disposed) return;
      runtime.app = app;
      runtime.controller = controller;
      useConfigStore.getState().set({ symbolImages: app.textures.symbolImages });
      window.__NEON__ = { getGrid: () => app.getGrid(), runtime };
      await controller.init();
      if (!disposed) onReady();
    })().catch((e: Error) => {
      console.error(e);
      if (!disposed) {
        onError(e.message || 'Failed to start');
        useUiStore.getState().showToast('Could not connect to the game server.');
      }
    });
    return () => {
      disposed = true;
      controller.destroy();
      app.destroy();
      if (runtime.app === app) {
        runtime.app = null;
        runtime.controller = null;
      }
    };
  }, [onReady, onError]);
  return <div ref={host} className="game-canvas" data-testid="game-canvas" />;
}
