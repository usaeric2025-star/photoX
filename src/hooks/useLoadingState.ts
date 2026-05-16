import { useState, useCallback } from 'react';

export type LoadingState = 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting';

export const useLoadingState = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

  const withLoading = useCallback(async <T>(state: LoadingState, fn: () => Promise<T>): Promise<T> => {
    setLoadingState(state);
    try {
      return await fn();
    } finally {
      setLoadingState('idle');
    }
  }, []);

  return { loadingState, setLoadingState, withLoading };
};
