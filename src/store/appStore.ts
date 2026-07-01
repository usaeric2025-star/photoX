import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { initAuthListener, authStore } from './authStore';
import { loadCategoriesFromCloud } from '#src/services/category/queries';
import { loadTagsFromCloud } from '#src/services/tag/queries';
import { mutate } from 'swr';
import { queryKeys } from '#lib/query/keys';
import { scheduler } from '#lib/task-queue/scheduler';
import { ErrorFactory } from '#lib/error/ErrorFactory';

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
    scheduler.restore().catch(e => ErrorFactory.handle(e, { context: '[appStore] Task restore failed' }));

    // 4. 背景並行啟動分類與標籤預加載 (DK-PATTERN: 前置緩存提高首屏響應速度)
    Promise.all([
      mutate(queryKeys.categories.all, loadCategoriesFromCloud()),
      mutate(queryKeys.tags.all, loadTagsFromCloud())
    ]).catch(e => ErrorFactory.handle(e, { context: '[appStore] Background prefetch failed' }));
    
    // 5. 標記初始化完成
    appStore.setState({ isLoading: false, error: null });
  } catch (error) {
    appStore.setState({ isLoading: false, error: error as Error });
    ErrorFactory.handle(error, { context: '[appStore] Initialization failed' });
  }
};
