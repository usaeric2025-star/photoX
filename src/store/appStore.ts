import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { initAuthListener, authStore } from './authStore';
import { logger } from '@/lib/logger';
import { fetchPublicSettings } from '@/services/settings/queries';
import { appQuery } from '@/lib/query';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { scheduler } from '@/lib/task-queue/scheduler';

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
    
    // 2. 執行初始 Session 獲取
    await authStore.getState().init();
    
    // 3. 恢復任務佇列（此時 Auth 已就緒）
    scheduler.restore().catch(e => logger.error('[appStore] Task restore failed', e));
    
    // 4. 標記初始化完成
    appStore.setState({ isLoading: false, error: null });
    logger.info('[appStore] Atomic initialization complete');
  } catch (error) {
    appStore.setState({ isLoading: false, error: error as Error });
    ErrorFactory.capture(error);
    logger.error('[appStore] Initialization failed', error);
  }
};
