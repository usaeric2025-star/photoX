import { useState } from 'react';

export type LoadingState = 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting';

export function useLoading(initialState: LoadingState = 'idle') {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

  const startLoading = (state: LoadingState) => setLoadingState(state);
  const stopLoading = () => setLoadingState('idle');

  const withLoading = async <T,>(state: LoadingState, fn: () => Promise<T>): Promise<T> => {
    startLoading(state);
    // Yield to browser so the loading spinner actually renders
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      return await fn();
    } finally {
      stopLoading();
    }
  };

  return { loadingState, setLoadingState, startLoading, stopLoading, withLoading };
}
