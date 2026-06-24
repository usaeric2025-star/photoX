import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useEffect, useRef, useState, Suspense } from 'react';
import { usePublicSettings } from '@/hooks';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { useAuth } from '@/lib/store';
import { authStore, initAuthListener } from '@/store/authStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PortalRoot } from '@/components/ui/PortalRoot';
import { User } from '@/types';
// Removed migrateStorage
import { logger } from '@/lib/logger';
import { useUI } from '@/lib/store';

export default function AppRoutes() {
  const appLang = useUI((s) => s.appLang);

  useEffect(() => {
    document.documentElement.dataset.lang = appLang;
  }, [appLang]);

  const auth = useAuth();
  const isLoading = auth.isLoading;
  const { data: settings, isPending: isSettingsPending } = usePublicSettings();

  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
    getInitialValueInEffect: false,
    deserialize: (val) => {
      try {
        const parsed = JSON.parse(val);
        return String(parsed);
      } catch {
        return val;
      }
    }
  });

  const isStaffMode = String(passcode) === settings?.access_passcode && !!settings?.access_passcode;

  const [forceUnblock, setForceUnblock] = useState(false);

  useEffect(() => {
    logger.debug('🛡️ [App] Initializing Auth/Settings...');
    authStore.getState().init();
    const cleanup = initAuthListener();
    
    // Force unblock after 8 seconds no matter what
    const timer = setTimeout(() => {
       logger.warn('⏳ [App] Force unblocking UI after 8 seconds safety timeout!');
       setForceUnblock(true);
    }, 8000);
    
    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // If auth and settings are no longer pending, signal that UI can start
    if (!isLoading && !isSettingsPending) {
       logger.info('✅ [App] Auth and Settings loaded. Unblocking UI...');
    }
  }, [isLoading, isSettingsPending]);

  const user = useAuth((s) => s.user);

  logger.debug('🔍 [App] Rendering AppRoutes:', { 
    pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    isLoading,
    isSettingsPending,
    forceUnblock,
    hasUser: !!user,
    isStaffMode,
    hasSettings: !!settings
  });
  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    if ((!isLoading && !isSettingsPending) || forceUnblock) {
      const prevUser = prevUserRef.current;
      const prevUserId = prevUser ? prevUser.id : null;
      const currentUserId = user ? user.id : null;

      if (prevUserId !== currentUserId) {
        logger.info('🔑 Auth status changed, invalidating router...', { hasUser: !!user });
        // router.invalidate();
      }
      prevUserRef.current = user;
    }
  }, [user, isLoading, isSettingsPending, forceUnblock]);

  useEffect(() => {
    // 確保骨架屏被移除
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton && (!isLoading && !isSettingsPending || forceUnblock)) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, [isLoading, isSettingsPending, forceUnblock]);

  useEffect(() => {
    if (user && !isLoading) {
      // Just log auth ready
      logger.info('🔑 Auth status ready for user:', user.id);
    }
  }, [user, isLoading]);

  if ((isLoading || isSettingsPending) && !forceUnblock) {
    logger.debug('⏳ [App] Blocking UI:', { isLoading, isSettingsPending });
    return <LoadingScreen />;
  }

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <Suspense fallback={<LoadingScreen />}>
          <RouterOrchestrator />
        </Suspense>
      </ConfirmProvider>
      <PortalRoot />
      <Analytics />
    </AppErrorBoundary>
  );
}

