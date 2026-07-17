import { useEffect, useRef } from 'react';
import { SlotGame } from '@/scenes/SlotGame';
import { soundManager } from '@/services/SoundManager';

/**
 * Owns the SlotGame lifecycle: boots Pixi into the given host element and
 * tears everything down on unmount. Audio is unlocked on the first user
 * gesture (browser autoplay policy).
 */
export function useGameEngine(hostRef: React.RefObject<HTMLDivElement | null>): void {
  const gameRef = useRef<SlotGame | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new SlotGame();
    gameRef.current = game;
    void game.boot(host);

    const unlockAudio = () => {
      soundManager.init();
      soundManager.resume();
      soundManager.startMusic();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      game.destroy();
      gameRef.current = null;
    };
  }, [hostRef]);
}
