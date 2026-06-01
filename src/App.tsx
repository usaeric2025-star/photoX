import { useEffect, useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { migrateStorage } from '@/lib/storage';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { globalHandleError } from './lib/error/errorHandler';
import { checkPublicAuth } from '@/lib/publicAuth';
import { ROUTES } from './config/constants';

export default function AppRoutes() {
  useEffect(() => {
    // Background cache cleanup and migrations
    migrateStorage();
    clearExpiredCaches(7).catch(err => globalHandleError(err, '本地缓存自动清理失败', true));
    
    // Default to admin if authenticated
    checkPublicAuth().then(res => {
        if (res.isAuthenticated && window.location.pathname === '/') {
            window.location.replace(ROUTES.ADMIN);
        }
    });
  }, []);

  console.log('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname 
  });

  const routerContext = useMemo(() => ({
    user: null,
    role: 'guest' as const,
    can: () => false,
    availableActions: [],
  }), []);

  return (
    <RouterProvider router={router} context={routerContext} />
  );
}

