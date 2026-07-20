import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS } from '#lib/storage.js';
import { initAuthListener, initAuth, setAuthLoading } from './auth.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { logger } from '#lib/logger.js';

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
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.all,
        queryFn: async () => {
          // This will be handled by the respective hook/api call
          return [];
        },
        staleTime: STALE_TIMES.LONG
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tags.all,
        queryFn: async () => {
          return [];
        },
        staleTime: STALE_TIMES.LONG
      })
    ]);
  } catch (err) {
    logger.warn('[App] Prefetch failed during init:', err);
  }

  setAppLoading(false);
  return { cleanupAuth };
};
