import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MenuScreen } from '@/ui/screens/MenuScreen';

/**
 * Routes.
 *
 * Each screen is its own chunk (lazy) so the first load only downloads the menu.
 * The Play screen pulls in Phaser; it is preloaded in the background once the
 * menu is visible (see `preloadGameChunk`).
 */
// The menu ships in the entry chunk (first paint); every other screen is
// downloaded on demand, which keeps the mobile initial load small.
const PlayScreen = lazy(() => import('@/ui/screens/PlayScreen').then((m) => ({ default: m.PlayScreen })));
const CreatorScreen = lazy(() =>
  import('@/ui/screens/CreatorScreen').then((m) => ({ default: m.CreatorScreen })),
);
const CareerScreen = lazy(() =>
  import('@/ui/screens/CareerScreen').then((m) => ({ default: m.CareerScreen })),
);
const SettingsScreen = lazy(() =>
  import('@/ui/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const NeighborhoodScreen = lazy(() =>
  import('@/ui/screens/NeighborhoodScreen').then((m) => ({ default: m.NeighborhoodScreen })),
);
const StoreScreen = lazy(() =>
  import('@/ui/screens/StoreScreen').then((m) => ({ default: m.StoreScreen })),
);
const FriendsScreen = lazy(() =>
  import('@/ui/screens/FriendsScreen').then((m) => ({ default: m.FriendsScreen })),
);
const NotFoundScreen = lazy(() =>
  import('@/ui/screens/NotFoundScreen').then((m) => ({ default: m.NotFoundScreen })),
);

function ScreenFallback(): ReactNode {
  return <div className="app-loading" role="status" aria-live="polite" />;
}

export const routes = {
  menu: '/',
  play: '/jogar',
  creator: '/criar',
  career: '/carreira',
  store: '/loja',
  neighborhood: '/bairro',
  settings: '/ajustes',
  friends: '/amigos',
} as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path={routes.menu} element={<MenuScreen />} />
      <Route
        path={routes.play}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <PlayScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.creator}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <CreatorScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.career}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <CareerScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.settings}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <SettingsScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.neighborhood}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <NeighborhoodScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.store}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <StoreScreen />
          </Suspense>
        }
      />
      <Route
        path={routes.friends}
        element={
          <Suspense fallback={<ScreenFallback />}>
            <FriendsScreen />
          </Suspense>
        }
      />
      <Route path="/menu" element={<Navigate to={routes.menu} replace />} />
      <Route
        path="*"
        element={
          <Suspense fallback={<ScreenFallback />}>
            <NotFoundScreen />
          </Suspense>
        }
      />
    </Routes>
  );
}

/**
 * Warms the Phaser chunk while the player looks at the menu.
 * `import()` of the same module is deduplicated by the bundler/runtime.
 */
export function preloadGameChunk(): void {
  const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1200));
  idle(() => {
    void import('@/game/GameCanvas');
    void import('phaser');
  });
}
