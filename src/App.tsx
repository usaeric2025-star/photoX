import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router/index';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useRef } from 'react';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
// Removed migrateStorage
import { clearExpiredCaches } from './lib/db/indexedDB';
import { handleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';
import { startAutoDiagnose } from '@/services/maintenance/autoDiagnose';
import { useUIStore } from '@/store/useUIStore';

export default function AppRoutes() {
  const appLang = useUIStore((s) => s.appLang);

  useEffect(() => {
    document.documentElement.dataset.lang = appLang;
  }, [appLang]);

  const isLoading = useAuthStore((s) => s.isLoading);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    document.title = 'PhotoX';
    // Background cache cleanup and migrations
    init();
    const cleanup = initAuthListener();
    clearExpiredCaches(7).catch(err => handleError(err, '本地缓存自动清理失败', true));
    return cleanup;
  }, [init]);

  logger.debug('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname 
  });

  const user = useAuthStore((s) => s.user);
  const prevUserRef = useRef<any>(undefined);

  useEffect(() => {
    if (!isLoading) {
      const prevUser = prevUserRef.current;
      const prevUserId = prevUser ? prevUser.id : null;
      const currentUserId = user ? user.id : null;

      if (prevUserId !== currentUserId) {
        logger.info('🔑 Auth status changed, invalidating router...', { hasUser: !!user });
        router.invalidate();
      }
      prevUserRef.current = user;
    }
  }, [user, isLoading]);

  const isDiagnosedRef = useRef(false);

  useEffect(() => {
    if (user && !isLoading && !isDiagnosedRef.current) {
      isDiagnosedRef.current = true;
      startAutoDiagnose();
    }
  }, [user, isLoading]);

  const routerContext = {
    user: user ?? null,
    role: user ? ('admin' as const) : ('guest' as const),
    can: () => !!user,
    availableActions: [],
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <RouterProvider router={router} context={routerContext} />
      </ConfirmProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

