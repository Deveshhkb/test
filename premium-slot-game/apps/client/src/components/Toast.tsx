import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useUiStore.getState().clearToast(), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" data-testid="toast">
      {toast}
    </div>
  );
}
