import useSWR, { SWRConfiguration } from 'swr';
import useSWRInfinite, { SWRInfiniteConfiguration, SWRInfiniteKeyLoader } from 'swr/infinite';
import { type, type Type } from 'arktype';

/**
 * Standard Query Factory for PhotoX using SWR.
 */

export function createQuery<TData, TVariables = void, TSchema extends Type = Type>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, signal?: AbortSignal) => Promise<TData>;
  staleTime?: number;
  schema?: TSchema;
  variablesSchema?: Type;
}) {
  return function useStandardQuery(variables: TVariables, options?: SWRConfiguration<TData>) {
    const key = config.queryKey(variables);

    // Run-time query variables validation if variablesSchema is provided
    if (config.variablesSchema && variables !== undefined) {
      const check = config.variablesSchema(variables);
      if (check instanceof type.errors) {
        throw new Error(`[Query Variables Validation Failed]: ${check.summary}`);
      }
    }

    const swr = useSWR<TData, Error>(
      JSON.stringify(key), // SWR requires stringifiable keys. Let's serialize.
      async ({ signal }) => config.queryFn(variables, signal as AbortSignal),
      {
        dedupingInterval: config.staleTime ?? 5 * 60 * 1000,
        ...options,
      }
    );

    // Schema validation if schema is provided
    if (config.schema && swr.data) {
        (config.schema as any).assert(swr.data);
    }
    
    return swr;
  };
}

export function createInfiniteQuery<TData, TVariables = unknown, TPageParam = any>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, pageParam: TPageParam, signal?: AbortSignal) => Promise<TData>;
  getNextPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | null | undefined;
  initialPageParam: TPageParam;
  staleTime?: number;
}) {
  return function useStandardInfiniteQuery(
    variables: TVariables,
    options?: SWRInfiniteConfiguration<TData, Error>
  ) {
    const getKey: SWRInfiniteKeyLoader = (pageIndex, previousPageData) => {
        if (previousPageData && !config.getNextPageParam(previousPageData, [])) return null;
        return JSON.stringify([...config.queryKey(variables), pageIndex]);
    };

    return useSWRInfinite<TData, Error>(
      getKey,
      async ([key, pageIndex]) => {
          // This is a bit tricky with SWR Infinite keys...
          // For now, let's assume queryFn handles the variables
          return config.queryFn(variables, pageIndex as TPageParam);
      },
      {
        dedupingInterval: config.staleTime ?? 5 * 60 * 1000,
        ...options
      }
    );
  };
}
