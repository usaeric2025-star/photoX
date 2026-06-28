import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { appStore, initializeApp } from '@/store/appStore';
import { usePublicSettings } from '@/hooks/settings/useSettings';

export function useAppInit() {
  const status = useStore(appStore);
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();

  useEffect(() => {
    initializeApp();
  }, []);

  const isAppStoreLoading = status.isLoading;
  const error = status.error || (settingsError as Error | null);
  const isError = !!error;
  
  // 核心邏輯：AppStore 初始化完成 且 Settings 也有數據 (或者報錯了)
  const isReady = !isAppStoreLoading && (!isSettingsLoading || isError);

  useEffect(() => {
    if (isReady && !isError) {
      if (typeof window !== 'undefined') {
        (window as any).__APP_READY__ = true;
      }
    }
  }, [isReady, isError]);

  return { 
    status: isReady ? (isError ? 'error' : 'success') : 'loading',
    error, 
    isLoading: !isReady, 
    isError,
    settings
  };
}
