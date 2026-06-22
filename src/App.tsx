import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouteProvider } from '@/router';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useRef, Suspense } from 'react';
import { usePublicSettings } from '@/hooks';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PortalRoot } from '@/components/ui/PortalRoot';
import { User } from '@/types';
// Removed migrateStorage
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

  const user = useAuthStore((s) => s.user);

  logger.debug('🔍 [App] Rendering AppRoutes:', { 
    pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    isLoading,
    isInitialDataLoading,
    isSettingsPending,
    hasUser: !!user,
    isStaffMode,
    hasSettings: !!settings
  });
  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    if (!isLoading && !isSettingsPending) {
      const prevUser = prevUserRef.current;
      const prevUserId = prevUser ? prevUser.id : null;
      const currentUserId = user ? user.id : null;

      if (prevUserId !== currentUserId) {
        logger.info('🔑 Auth status changed, invalidating router...', { hasUser: !!user });
        // router.invalidate();
      }
      prevUserRef.current = user;
    }
  }, [user, isLoading]);

  const isDiagnosedRef = useRef(false);

  useEffect(() => {
    // 確保骨架屏被移除
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton && !isLoading && !isSettingsPending && !isInitialDataLoading) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, [isLoading, isSettingsPending, isInitialDataLoading]);

  useEffect(() => {
    if (user && !isLoading && !isDiagnosedRef.current) {
      isDiagnosedRef.current = true;
      startAutoDiagnose();
    }
  }, [user, isLoading]);

  if (isLoading || isSettingsPending || isInitialDataLoading) {
    if (isLoading) logger.debug('⏳ [App] Blocking: isLoading (Auth)');
    if (isSettingsPending) logger.debug('⏳ [App] Blocking: isSettingsPending (API)');
    if (isInitialDataLoading) logger.debug('⏳ [App] Blocking: isInitialDataLoading (UI Store)');
    return <LoadingScreen />;
  }

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <Suspense fallback={<LoadingScreen />}>
          <RouteProvider>
            <RouterOrchestrator />
          </RouteProvider>
        </Suspense>
      </ConfirmProvider>
      <PortalRoot />
      <Analytics />
    </AppErrorBoundary>
  );
}

