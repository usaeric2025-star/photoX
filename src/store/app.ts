import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS } from '#lib/storage.js';
import { initAuthListener, initAuth, setAuthLoading } from './auth.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { logger } from '#lib/logger.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Category, Tag } from '#src/types/index.js';

// --- Atoms ---
export const appLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.LANG, 'en');
export const descLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.DESC_LANG, 'zh');
export const appLoadingAtom = atom(true);
export const appErrorAtom = atom(null as Error | null);

const store = getDefaultStore();

// --- Actions ---
export const setAppLoading = (loading: boolean) => store.set(appLoadingAtom, loading);
export const setAppError = (error: Error | null) => store.set(appErrorAtom, error);

export const initApp = async () => {
  setAppLoading(true);
  setAuthLoading(true);

  // Initialize auth
  const cleanupAuth = initAuthListener();
  await initAuth();

  // Prefetch critical data
  try {
    // Invalidate existing cached categories and tags so we don't use stale empty arrays from IndexedDB
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.all,
        queryFn: async () => {
          const res = await api.categories.$get();
          const data = await ErrorFactory.unwrap<Category[]>(res, 'Prefetch categories failed');
          return data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        },
        staleTime: 0
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tags.all,
        queryFn: async () => {
          const res = await api.tags.$get();
          return await ErrorFactory.unwrap<Tag[]>(res, 'Prefetch tags failed');
        },
        staleTime: 0
      })
    ]);
  } catch (err) {
    logger.warn('[App] Prefetch failed during init:', err);
  }

  setAppLoading(false);
  return { cleanupAuth };
};
