import { GameCanvas } from '@/game/GameCanvas';
import { HUD } from '@/ui/HUD';

/** The main game route: full-viewport canvas with DOM UI layered above. */
export default function GamePage() {
  return (
    <main className="game-page">
      <GameCanvas />
      <HUD />
    </main>
  );
}
