import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { initAuthListener, authStore } from './authStore';
import { logger } from '@/lib/logger';
import { fetchPublicSettings } from '@/services/settings/queries';
import { appQuery } from '@/lib/query';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export interface AppStatusState {
  isLoading: boolean;
  error: Error | null;
}

export const appStore = createStore<AppStatusState>({
  isLoading: true,
  error: null
});

export const appLoadingSignal = signal(appStore, 'isLoading');
export const appErrorSignal = signal(appStore, 'error');

export const initializeApp = async () => {
  try {
    // 1. 設置全域 Auth 監聽
    initAuthListener();
    
    // 2. 並行執行初始 Session 獲取與 Settings 獲取 (原子化組合)
    const authState = authStore.getState();
    const authInitPromise = authState?.init ? authState.init() : Promise.resolve();
    
    // 透過 SWR 機制預加載 Settings 並寫入快取
    const settingsPromise = appQuery.mutate(['settings', 'public'], fetchPublicSettings());
    
    await Promise.all([authInitPromise, settingsPromise]);
    
    // 3. 標記初始化完成
    appStore.setState({ isLoading: false, error: null });
    logger.info('[appStore] Atomic initialization complete');
  } catch (error) {
    appStore.setState({ isLoading: false, error: error as Error });
    ErrorFactory.capture(error);
    logger.error('[appStore] Initialization failed', error);
  }
};
