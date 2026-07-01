import { useEffect } from 'react';
import { useSignal } from '#lib/store';
import { initializeApp, appLoadingSignal, appErrorSignal } from '#src/store/appStore';
import { usePublicSettings } from '#src/hooks/settings/useSettings';

export function useAppInit() {
  const isAppStoreLoading = useSignal(appLoadingSignal);
  const appError = useSignal(appErrorSignal);
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();

  useEffect(() => {
    // 1. 啟動核心初始化 (Auth 等)
    initializeApp();
  }, []);

  const error = appError || (settingsError as Error | null);
  const isError = !!error;
  
  // 核心邏輯優化：只要 AppStore 初始化完成即可渲染，Settings 可以在背景繼續加載
  // 這樣公開頁面可以立即顯示骨架屏或基礎佈局，而不是死等 2-30 秒
  const isReady = !isAppStoreLoading;

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
    settings,
    isSettingsLoading
  };
}
