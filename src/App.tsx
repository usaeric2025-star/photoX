import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { migrateStorage } from '@/lib/storage';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { globalHandleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';
import { startAutoDiagnose } from '@/services/maintenance/autoDiagnose';

export default function AppRoutes() {
  useEffect(() => {
    document.title = 'PhotoX';
    // Background cache cleanup and migrations
    migrateStorage();
    clearExpiredCaches(7).catch(err => globalHandleError(err, '本地缓存自动清理失败', true));
    
    // Start periodic background diagnosis
    startAutoDiagnose();
  }, []);

  logger.debug('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname 
  });

  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      logger.info('🔑 Auth status changed, invalidating router...', { hasUser: !!user });
      router.invalidate();
    }
  }, [user, isLoading]);

  const routerContext = useMemo(() => ({
    user: user ?? null,
    role: user ? ('admin' as const) : ('guest' as const),
    can: () => !!user,
    availableActions: [],
  }), [user]);

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

