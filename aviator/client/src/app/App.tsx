import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  return <RouterProvider router={router} />;
}
