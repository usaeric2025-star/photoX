import useSWR, { SWRConfiguration, mutate as swrMutate } from 'swr';
import { useState } from 'react';

/**
 * 統一的 Query Adapter (SWR Facade)
 */

/**
 * Global Query/Mutation Controller
 */
export const appQuery = {
  /**
   * Invalidate or update cache globally
   * If a functional updater is provided as the second argument, it's used directly for optimisticData
   */
  mutate: (key: string | readonly unknown[], data?: unknown, options?: unknown) => {
    if (typeof data === 'function' && !options) {
      return swrMutate(key as import('swr').Key, data, {
        optimisticData: data as (currentData: unknown) => unknown,
        rollbackOnError: true,
      });
    }
    return swrMutate(key as import('swr').Key, data, options as import('swr').MutatorOptions);
  },
};

/**
 * Standard data fetching hook
 */
export function useAppQuery<TData = unknown>(
  key: string | readonly unknown[] | null,
  fetcher: (...args: unknown[]) => Promise<TData>,
  options?: SWRConfiguration<TData>
) {
  const result = useSWR<TData>(key as import('swr').Key, fetcher, {
    ...options,
  });
  return { ...result, isPending: result.isLoading };
}

/**
 * Standard mutation hook (trigger-based)
 */
export function useAppMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void,
    onError?: (error: Error, variables: TVariables) => void
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mutationFn(variables);
      options?.onSuccess?.(data, variables);
      return data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      options?.onError?.(err, variables);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    mutate: trigger, 
    mutateAsync: trigger, 
    trigger,
    isPending: isLoading, 
    isMutating: isLoading, 
    error 
  };
}

// For compatibility with useSWRConfig pattern
export { useSWRConfig as useAppQueryClient } from 'swr';
export { swrMutate as mutate };
