import { useGameStore } from '@/store/gameStore';
import { GamePhase } from '@/types';
import { gameController } from '@/services/GameController';

/** Shown when the demo balance hits zero. */
export function GameOverOverlay() {
  const phase = useGameStore((s) => s.phase);
  if (phase !== GamePhase.GameOver) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal gameover">
        <h2>Out of credits</h2>
        <p>Your demo balance has run out. Restart to play again with fresh credits.</p>
        <button className="primary-btn" onClick={() => gameController.restart()}>
          RESTART DEMO
        </button>
      </div>
    </div>
  );
}
