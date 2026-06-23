import { showToast } from '@/lib/ui/toast';
import { useEffect } from 'react';

interface QueryFallbackOptions {
  showErrorToast?: boolean;
  resourceName?: string;
}

/**
 * [HOOK] useQueryWithFallback
 * Unified wrapper for SWR to handle loading and standard error feedback.
 */
export function useQueryWithFallback<T>(
  queryResult: { data: T | undefined; error: Error | undefined; isLoading: boolean },
  options: QueryFallbackOptions = {}
) {
  const { showErrorToast = true, resourceName = '数据' } = options;

  useEffect(() => {
    if (queryResult.error && showErrorToast) {
      showToast.error(`${resourceName} 加载失败`, {
        description: '请检查网络或刷新重試'
      });
    }
  }, [queryResult.error, showErrorToast, resourceName]);

  return {
    ...queryResult,
    hasData: !!queryResult.data,
    isEmpty: Array.isArray(queryResult.data) && queryResult.data.length === 0,
  };
}
