import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/** Transient error banner (lost connection, API failure, invalid bet...). */
export function ErrorToast() {
  const error = useGameStore((s) => s.error);
  const setError = useGameStore((s) => s.setError);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);

  if (!error) return null;
  return (
    <div className="error-toast" role="alert">
      ⚠ {error}
    </div>
  );
}
