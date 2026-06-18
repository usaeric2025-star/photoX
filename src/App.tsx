import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router/index';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useRef } from 'react';
import { usePublicSettings } from '@/hooks';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
// Removed migrateStorage
import { handleError } from './lib/error/errorHandler';
import { logger } from '@/lib/logger';
import { startAutoDiagnose } from '@/features/diagnostics/autoDiagnose';
import { useUIStore } from '@/store/useUIStore';

export default function AppRoutes() {
  const appLang = useUIStore((s) => s.appLang);

  useEffect(() => {
    document.documentElement.dataset.lang = appLang;
  }, [appLang]);

  const isLoading = useAuthStore((s) => s.isLoading);
  const isInitialDataLoading = useUIStore((s) => s.isInitialDataLoading);
  const setInitialDataLoading = useUIStore((s) => s.setInitialDataLoading);
  const init = useAuthStore((s) => s.init);
  const { data: settings, isPending: isSettingsPending } = usePublicSettings();

  useEffect(() => {
    if (isInitialDataLoading) {
      const timer = setTimeout(() => {
        logger.warn('⚠️ [App] Initial data loading timeout, clearing...');
        setInitialDataLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInitialDataLoading, setInitialDataLoading]);

  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
    getInitialValueInEffect: false,
  });

  const isStaffMode = passcode === settings?.access_passcode && !!settings?.access_passcode;

  useEffect(() => {
    document.title = 'PhotoX';
    // Background init
    init();
    const cleanup = initAuthListener();
    return cleanup;
  }, [init]);

  logger.debug('🔍 AppRoutes 渲染:', { 
    pathname: window.location.pathname,
    isLoading,
    isSettingsPending,
    hasSettings: !!settings?.access_passcode
  });

  const user = useAuthStore((s) => s.user);
  const prevUserRef = useRef<any>(undefined);

  useEffect(() => {
    if (!isLoading && !isSettingsPending) {
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
    role: user ? ('admin' as const) : isStaffMode ? ('staff' as const) : ('guest' as const),
    isStaffMode,
    can: () => !!user || isStaffMode,
    availableActions: [] as string[],
  };

  if (isLoading || isSettingsPending || isInitialDataLoading) {
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

