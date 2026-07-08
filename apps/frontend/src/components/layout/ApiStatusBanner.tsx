'use client';

import { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';

/**
 * Shows a clear banner when the storefront can't reach the backend API,
 * instead of failing silently in the console. Auto-hides once a request
 * succeeds again. Listens for the 'nova-api-status' events dispatched by lib/api.
 */
export default function ApiStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onStatus = (e: Event) => {
      const status = (e as CustomEvent).detail;
      if (status === 'offline') setOffline(true);
      else if (status === 'online') {
        setOffline(false);
        setDismissed(false);
      }
    };
    window.addEventListener('nova-api-status', onStatus);
    return () => window.removeEventListener('nova-api-status', onStatus);
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[120] bg-red-600 text-white">
      <div className="container-nova flex items-center gap-3 py-2 text-sm">
        <WifiOff className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          Can&apos;t reach the server. Start the backend (<code className="rounded bg-white/20 px-1">npm run dev:backend</code>)
          and make sure MongoDB is running.
        </p>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 rounded p-1 hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
