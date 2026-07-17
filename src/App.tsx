import { GameCanvas } from '@/components/GameCanvas';
import { TopBar } from '@/components/TopBar';
import { HUD } from '@/components/HUD';
import { BonusModal } from '@/components/BonusModal';
import { ErrorToast } from '@/components/ErrorToast';
import { GameOverOverlay } from '@/components/GameOverOverlay';
import { useGameStore } from '@/store/gameStore';
import { GamePhase } from '@/types';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const loading = phase === GamePhase.Loading;

  return (
    <div className="app">
      <GameCanvas />
      {!loading && (
        <>
          <TopBar />
          <HUD />
        </>
      )}
      <BonusModal />
      <GameOverOverlay />
      <ErrorToast />
    </div>
  );
}
