import { useAppQuery as baseUseAppQuery } from '@/lib/query';
import { type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

/**
 * 統一 API 查詢 Hook
 */
export function useAppQuery<TData, TError = Error, TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) {
  return baseUseAppQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}
