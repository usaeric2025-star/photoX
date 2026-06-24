import { useAppQuery as baseUseAppQuery } from '@/lib/query';
import type { SWRConfiguration } from 'swr';

/**
 * 統一 API 查詢 Hook
 */
export function useAppQuery<TData>(
  queryKey: readonly unknown[] | string | null,
  queryFn: () => Promise<TData>,
  options?: SWRConfiguration<TData>
) {
  return baseUseAppQuery(queryKey, queryFn, options);
}
