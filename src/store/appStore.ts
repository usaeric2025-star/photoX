import { getDefaultStore, PrimitiveAtom } from 'jotai';
import { appLoadingAtom, appErrorAtom } from './atoms/app/index.js';
import { initAuthListener, initAuth, setLoading } from './authActions.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { scheduler } from '#lib/task-queue/scheduler.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { withTimeout } from '#lib/utils.js';
import { api } from '#lib/api.js';
import { storage } from '#lib/storage.js';
import type { Category, Tag } from '#src/types/index.js';

interface AppStatusState {
  isLoading: boolean;
  error: Error | null;
}

export { appLoadingAtom, appErrorAtom };

const store = getDefaultStore();


export const initializeApp = async () => {
  try {
    initAuthListener();
    
    try {
      await withTimeout(initAuth(), 4000, 'Auth Store Init');
    } catch (e) {
      ErrorFactory.handle(e, { context: '[appStore] Auth init timeout or error, proceeding as guest' });
      setLoading(false);
    }
    
    scheduler.restore().catch(e => ErrorFactory.handle(e, { context: '[appStore] Task restore failed' }));

    Promise.all([
      ErrorFactory.unwrap<Category[]>(api.categories.$get(), 'Prefetch categories failed')
        .then(data => queryClient.setQueryData(queryKeys.categories.all, data)),
      ErrorFactory.unwrap<Tag[]>(api.tags.$get(), 'Prefetch tags failed')
        .then(data => queryClient.setQueryData(queryKeys.tags.all, data))
    ]).catch(e => ErrorFactory.handle(e, { context: '[appStore] Background prefetch failed' }));
    
    store.set(appLoadingAtom as any, false);
    store.set(appErrorAtom as any, null);
  } catch (error) {
    store.set(appLoadingAtom as any, false);
    store.set(appErrorAtom as any, error as Error);
    ErrorFactory.handle(error, { context: '[appStore] Initialization failed' });
  } finally {
    store.set(appLoadingAtom as any, false);
  }
};

