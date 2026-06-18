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

export function createInfiniteQuery<TData, TVariables = unknown, TPageParam = any, TResult = InfiniteData<TData, TPageParam>>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, pageParam: TPageParam, signal?: AbortSignal) => Promise<TData>;
  getNextPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | null | undefined;
  initialPageParam: TPageParam;
  select?: (data: InfiniteData<TData, TPageParam>) => TResult;
  staleTime?: number;
  gcTime?: number;
  placeholderData?: TResult;
}) {
  return function useStandardInfiniteQuery(
    variables: TVariables,
    options?: Partial<UseInfiniteQueryOptions<TData, Error, TResult, readonly unknown[], TPageParam>>
  ) {
    return useInfiniteQuery<TData, Error, TResult, readonly unknown[], TPageParam>({
      queryKey: config.queryKey(variables),
      queryFn: (context) => {
        const pageParam = (context.pageParam ?? config.initialPageParam) as TPageParam;
        return config.queryFn(variables, pageParam, context.signal);
      },
      initialPageParam: config.initialPageParam,
      getNextPageParam: config.getNextPageParam,
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 30 * 60 * 1000,
      select: (config.select || ((d) => d as unknown as TResult)) as (data: InfiniteData<TData, TPageParam>) => TResult,
      placeholderData: config.placeholderData as undefined,
      ...options
    });
  };
}
