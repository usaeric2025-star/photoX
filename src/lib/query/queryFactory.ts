import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions, UseQueryResult, UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { Type } from 'arktype';

/**
 * Standard Query Factory for PhotoX.
 * Ensures consistent staleTime, gcTime, and retry strategies.
 * Supports optional ArkType schema binding for automatic validation.
 */

export function createQuery<TData, TVariables = void, TSchema extends Type = Type>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, signal?: AbortSignal) => Promise<TData>;
  staleTime?: number;
  gcTime?: number;
  schema?: TSchema;
}) {
  return function useStandardQuery(variables: TVariables, options?: Partial<UseQueryOptions<TData>>) {
    // Handling the case where variables might be undefined/void but options are passed as first argument
    const actualVariables = (typeof variables === 'object' && variables !== null && ('enabled' in variables || 'staleTime' in variables) && !options) 
      ? undefined as unknown as TVariables
      : variables;
    const actualOptions = actualVariables === undefined ? (variables as unknown as Partial<UseQueryOptions<TData>>) : options;

    return useQuery<TData, Error, TData, readonly unknown[]>({
      queryKey: config.queryKey(actualVariables),
      queryFn: ({ signal }) => config.queryFn(actualVariables, signal),
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      ...actualOptions,
      select: (data: TData) => {
          if (config.schema) {
              return (config.schema as unknown as { (data: unknown): { assert(): TData } })(data).assert();
          }
          if (actualOptions?.select) {
              return actualOptions.select(data);
          }
          return data;
      },
    });
  };
}

export function createInfiniteQuery<TData, TVariables = unknown, TResult = InfiniteData<TData>>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, pageParam: number, signal?: AbortSignal) => Promise<TData>;
  getNextPageParam: (lastPage: TData, allPages: TData[]) => number | null | undefined;
  select?: (data: InfiniteData<TData>) => TResult;
  staleTime?: number;
  gcTime?: number;
  placeholderData?: TResult;
}) {
  return function useStandardInfiniteQuery(
    variables: TVariables,
    options?: Omit<any, 'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'>
  ) {
    return useInfiniteQuery<TData, Error, TResult, readonly unknown[], number>({
      queryKey: config.queryKey(variables),
      queryFn: (context: { pageParam?: unknown; signal: AbortSignal }) => {
        const pageParam = typeof context.pageParam === 'number' ? context.pageParam : 1;
        return config.queryFn(variables, pageParam, context.signal);
      },
      initialPageParam: 1,
      getNextPageParam: config.getNextPageParam,
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 30 * 60 * 1000,
      select: config.select ? (config.select as unknown as (data: InfiniteData<TData, number>) => TResult) : ((d: unknown) => d as TResult),
      placeholderData: config.placeholderData,
      ...options
    } as any);
  };
}
