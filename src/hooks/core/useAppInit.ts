import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { appStore, initializeApp } from '@/store/appStore';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { prefetchPhotos } from '@/lib/query/hooks/usePhotos';

export function useAppInit() {
  const status = useStore(appStore);
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();

  useEffect(() => {
    // 1. 啟動核心初始化 (Auth 等)
    initializeApp();
    
    // 2. 啟動首屏數據預取 (公開頁面默認列表)
    // 這樣在 LoadingScreen 消失前，數據可能已經加載好了
    prefetchPhotos({ onlyGroupsCover: true });
  }, []);

  const isAppStoreLoading = status.isLoading;
  const error = status.error || (settingsError as Error | null);
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
