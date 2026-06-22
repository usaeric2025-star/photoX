import {
  useQuery as useRqQuery,
  useMutation as useRqMutation,
  useInfiniteQuery as useRqInfiniteQuery,
  useQueryClient as useRqQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';

/**
 * 統一的 Query Adapter
 * 職責：隱藏 TanStack Query 的實作細節，提供一致的 API 介面。
 * 未來如果更換為 Storve，只需要修改這裡即可。
 */

export function useAppQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends import('@tanstack/react-query').QueryKey = import('@tanstack/react-query').QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
) {
  return useRqQuery<TQueryFnData, TError, TData, TQueryKey>(options);
}

export function useAppMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  return useRqMutation<TData, TError, TVariables, TContext>(options);
}

export function useAppInfiniteQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends import('@tanstack/react-query').QueryKey = import('@tanstack/react-query').QueryKey,
  TPageParam = unknown
>(
  options: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
) {
  return useRqInfiniteQuery<TQueryFnData, TError, TData, TQueryKey, TPageParam>(options);
}

export function useAppQueryClient() {
  return useRqQueryClient();
}

// 重新導出必要的型別
export type { UseQueryOptions, UseMutationOptions, UseInfiniteQueryOptions };
