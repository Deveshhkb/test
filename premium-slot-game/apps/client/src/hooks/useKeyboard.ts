import { useEffect } from 'react';
import { runtime } from '../game/runtime';
import { useUiStore } from '../stores/uiStore';

/** Space / Enter = spin (or quick stop). */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUiStore.getState().modal) {
        if (e.key === 'Escape') useUiStore.getState().close();
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'BUTTON') return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        void runtime.controller?.spin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
