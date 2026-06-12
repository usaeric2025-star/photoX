import { UseQueryResult } from '@tanstack/react-query';
import { showToast } from '@/lib/ui/toast';
import { useEffect } from 'react';

interface QueryFallbackOptions {
  showErrorToast?: boolean;
  resourceName?: string;
}

/**
 * [HOOK] useQueryWithFallback
 * Unified wrapper for TanStack Query to handle loading and standard error feedback.
 */
export function useQueryWithFallback<T>(
  queryResult: UseQueryResult<T>,
  options: QueryFallbackOptions = {}
) {
  const { showErrorToast = true, resourceName = '数据' } = options;

  useEffect(() => {
    if (queryResult.isError && showErrorToast) {
      showToast.error(`${resourceName} 加载失败`, {
        description: '请检查网络或刷新重試'
      });
    }
  }, [queryResult.isError, showErrorToast, resourceName]);

  return {
    ...queryResult,
    // Convenience flags
    hasData: !!queryResult.data,
    isEmpty: Array.isArray(queryResult.data) && queryResult.data.length === 0,
  };
}
