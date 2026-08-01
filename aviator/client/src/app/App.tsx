import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { initViewportTracking } from '@/store/viewportStore';

// Route-level code splitting: the game (and its heavy Pixi/GSAP payload)
// loads only when its route mounts. Lobby/help/admin routes later join this
// router without touching the game bundle.
const GamePage = lazy(() => import('@/pages/GamePage'));

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="route-fallback" role="status">
      {t('app.loading')}
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <GamePage />
      </Suspense>
    ),
  },
]);

export default function App() {
  // One place owns all window-level viewport listeners for the DOM layer;
  // the returned cleanup makes this StrictMode-safe.
  useEffect(() => initViewportTracking(), []);

  return <RouterProvider router={router} />;
}
