import { useEffect, useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { migrateStorage } from '@/lib/storage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { globalHandleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';
import { Analytics } from '@vercel/analytics/react';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AppRoutes() {
  useEffect(() => {
    document.title = 'PhotoX';
    // Background cache cleanup and migrations
    migrateStorage();
    clearExpiredCaches(7).catch(err => globalHandleError(err, '本地缓存自动清理失败', true));
  }, []);

  logger.debug('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname 
  });

  const { user, isLoading } = useAuth();

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
      <RouterProvider router={router} context={routerContext} />
      <Analytics />
    </ErrorBoundary>
  );
}

