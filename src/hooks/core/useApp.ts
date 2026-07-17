import { useEffect } from 'react';
import { useSignal } from '#lib/store/index.js';
import { initializeApp, appLoadingSignal, appErrorSignal } from '#src/store/appStore.js';
import { usePublicSettings } from '#src/hooks/settings/useSettings.js';
import { useAdminMode } from './auth/useAdminMode.js';
import { usePermission } from './auth/usePermission.js';
import { logger } from '#lib/logger.js';

// --- App Init Hook ---
export function useAppInit() {
  const isAppStoreLoading = useSignal(appLoadingSignal);
  const appError = useSignal(appErrorSignal);
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();

  useEffect(() => { 
    initializeApp(); 
  }, []);

  const error = appError || (settingsError as Error | null);
  const isError = !!error;
  const isReady = !isAppStoreLoading;

  useEffect(() => {
    if (isReady && !isError && typeof window !== 'undefined') {
      (window as any).__APP_READY__ = true;
    }
  }, [isReady, isError]);

  return { 
    status: isReady ? (isError ? 'error' : 'success') : 'loading',
    error, isLoading: !isReady, isError, settings, isSettingsLoading
  };
}

// --- Is Management Hook ---
export function useIsManagement() {
  const isAdminMode = useAdminMode();
  const { can } = usePermission();
  return isAdminMode && (can('photo:edit') || can('photo:delete') || can('photo:batch-edit'));
}

// --- Performance Hook ---
export function usePerformance(name: string, threshold = 10) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      if (duration > threshold) {
        logger.debug(`[PERF] ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [name, threshold]);
}
