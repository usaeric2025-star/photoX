import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

interface UsePrefetchOptions {
  /** 防抖延遲（毫秒），預設 80ms */
  delay?: number;
  /** staleTime（毫秒），預設使用配置常量 */
  staleTime?: number;
}

export const usePrefetch = <T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options: UsePrefetchOptions = {}
) => {
  const { delay = 80, staleTime } = options;
  const queryClient = useQueryClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const prefetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        ...(staleTime !== undefined ? { staleTime } : {}),
      });
    }, delay);
  }, [queryClient, queryKey, queryFn, staleTime, delay]);

  const cancelPrefetch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { prefetch, cancelPrefetch };
};
