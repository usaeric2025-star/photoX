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
    const actualOptions = actualVariables === undefined ? (variables as any) : options;

    return useQuery<TData, Error, TData, any>({
      queryKey: config.queryKey(actualVariables),
      queryFn: ({ signal }) => config.queryFn(actualVariables, signal),
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      ...actualOptions,
      select: (data: any) => config.schema ? (config.schema as any)(data).assert() : (actualOptions?.select ? actualOptions.select(data) : data),
    });
  };
}

export function createInfiniteQuery<TData, TVariables = any, TResult = InfiniteData<TData>>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, pageParam: number, signal?: AbortSignal) => Promise<TData>;
  getNextPageParam: (lastPage: TData, allPages: TData[]) => any;
  select?: (data: InfiniteData<TData>) => TResult;
  staleTime?: number;
  gcTime?: number;
  placeholderData?: any;
}) {
  return function useStandardInfiniteQuery(variables: TVariables, options?: any) {
    return useInfiniteQuery<TData, Error, TResult, any, number>({
      queryKey: config.queryKey(variables),
      queryFn: ({ pageParam = 1, signal }) => config.queryFn(variables, pageParam as number, signal),
      initialPageParam: 1,
      getNextPageParam: config.getNextPageParam,
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 30 * 60 * 1000,
      select: config.select as any,
      placeholderData: config.placeholderData,
      ...options
    });
  };
}
