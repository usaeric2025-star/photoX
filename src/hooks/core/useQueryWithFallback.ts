import { showToast } from '@/lib/ui/toast';
import { useEffect } from 'react';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

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
      const wrapped = ErrorFactory.wrap(queryResult.error, '加载', resourceName);
      showToast.error(wrapped);
    }
  }, [queryResult.error, showErrorToast, resourceName]);

  return {
    ...queryResult,
    hasData: !!queryResult.data,
    isEmpty: Array.isArray(queryResult.data) && queryResult.data.length === 0,
  };
}
