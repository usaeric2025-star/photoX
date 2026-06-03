import { useEffect, useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { migrateStorage } from '@/lib/storage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { globalHandleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';

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

  const routerContext = useMemo(() => ({
    user: null,
    role: 'guest' as const,
    can: () => false,
    availableActions: [],
  }), []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} context={routerContext} />
    </ErrorBoundary>
  );
}

