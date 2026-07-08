import { signal } from '@preact/signals-react';
import { initAuthListener, initAuth, authLoadingSignal } from './authStore.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { scheduler } from '#lib/task-queue/scheduler.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { withTimeout } from '#lib/utils.js';
import { api } from '#lib/api.js';

export interface AppStatusState {
  isLoading: boolean;
  error: Error | null;
}

export const appLoadingSignal = signal<boolean>(true);
export const appErrorSignal = signal<Error | null>(null);

export const initializeApp = async () => {
  try {
    // 1. 設置全域 Auth 監聽
    initAuthListener();
    
    // 2. 執行初始 Session 獲取 (P0: 增加強制逾時，避免 SDK 掛起導致全白屏)
    try {
      await withTimeout(initAuth(), 4000, 'Auth Store Init');
    } catch (e) {
      ErrorFactory.handle(e, { context: '[appStore] Auth init timeout or error, proceeding as guest' });
      authLoadingSignal.value = false; // 強制結束加載狀態
    }
    
    // 3. 恢復任務佇列（此時 Auth 已就緒）
    scheduler.restore().catch(e => ErrorFactory.handle(e, { context: '[appStore] Task restore failed' }));

    // 4. 背景並行啟動分類與標籤預加載 (DK-PATTERN: 前置緩存提高首屏響應速度)
    Promise.all([
      api.categories.$get().then(r => r.json()).then(j => j.success ? queryClient.setQueryData(queryKeys.categories.all, j.data) : null),
      api.tags.$get().then(r => r.json()).then(j => j.success ? queryClient.setQueryData(queryKeys.tags.all, j.data) : null)
    ]).catch(e => ErrorFactory.handle(e, { context: '[appStore] Background prefetch failed' }));
    
    // 5. 標記初始化完成
    appLoadingSignal.value = false;
    appErrorSignal.value = null;
  } catch (error) {
    appLoadingSignal.value = false;
    appErrorSignal.value = error as Error;
    ErrorFactory.handle(error, { context: '[appStore] Initialization failed' });
  }
};
