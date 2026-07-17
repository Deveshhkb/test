import { useRef } from 'react';
import { useGameEngine } from '@/hooks/useGameEngine';

/** Full-viewport host for the Pixi application. */
export function GameCanvas(): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useGameEngine(hostRef);
  return <div ref={hostRef} className="game-canvas" aria-label="Slot machine game" />;
}
