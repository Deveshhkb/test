import { useCallback, useState } from 'react';
import { ControlBar } from './components/ControlBar';
import { GameCanvas } from './components/GameCanvas';
import { Header } from './components/Header';
import { LoadingScreen } from './components/LoadingScreen';
import { Modals } from './components/Modals';
import { Toast } from './components/Toast';
import { UiStage } from './components/UiStage';
import { runtime } from './game/runtime';
import { useKeyboard } from './hooks/useKeyboard';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phase = useGameStore((s) => s.phase);
  useKeyboard();
  const onReady = useCallback(() => setLoaded(true), []);
  const onError = useCallback((m: string) => setError(m), []);

  return (
    <div className={`app phase-${phase.toLowerCase()}`}>
      <GameCanvas onReady={onReady} onError={onError} />
      <UiStage>
        <Header />
        <ControlBar />
      </UiStage>
      <Modals />
      <Toast />
      {!started && (
        <LoadingScreen
          ready={loaded}
          error={error}
          onStart={() => {
            runtime.controller?.unlockAudio();
            setStarted(true);
          }}
        />
      )}
    </div>
  );
}
