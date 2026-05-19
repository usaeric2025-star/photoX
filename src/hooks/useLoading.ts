import { useState, useCallback } from 'react';

export type LoadingState = 'idle' | 'syncing' | 'sync-pull' | 'sync-push' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting';

export function useLoading(initialState: LoadingState = 'idle') {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

  const startLoading = useCallback((state: LoadingState) => setLoadingState(state), []);
  const stopLoading = useCallback(() => setLoadingState('idle'), []);

  const withLoading = useCallback(async <T,>(state: LoadingState, fn: () => Promise<T>): Promise<T> => {
    startLoading(state);
    // Yield to browser so the loading spinner actually renders
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      return await fn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return { loadingState, setLoadingState, startLoading, stopLoading, withLoading };
}
