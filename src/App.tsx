import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router/index';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { migrateStorage } from '@/services/system/storageService';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { handleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';
import { startAutoDiagnose } from '@/services/maintenance/autoDiagnose';

export default function AppRoutes() {
  useEffect(() => {
    document.title = 'PhotoX';
    // Background cache cleanup and migrations
    migrateStorage();
    clearExpiredCaches(7).catch(err => handleError(err, '本地缓存自动清理失败', true));
  }, []);

  logger.debug('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname 
  });

  const { user, isLoading } = useAuth();
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

  useEffect(() => {
    if (user && !isLoading) {
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

