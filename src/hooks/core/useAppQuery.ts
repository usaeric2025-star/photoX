import { useAppQuery as baseUseAppQuery } from '@/lib/query';

/**
 * 統一 API 查詢 Hook
 */
export function useAppQuery<TData>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options?: any
) {
  return baseUseAppQuery(queryKey, queryFn, options);
}
