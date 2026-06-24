import useSWR, { SWRConfiguration } from 'swr';
import useSWRInfinite, { SWRInfiniteConfiguration, SWRInfiniteKeyLoader } from 'swr/infinite';
import * as v from 'valibot';

/**
 * Standard Query Factory for PhotoX using SWR.
 */

export function createQuery<TData, TVariables = void>(config: {
  queryKey: (variables: TVariables) => readonly unknown[];
  queryFn: (variables: TVariables, signal?: AbortSignal) => Promise<TData>;
  staleTime?: number;
  schema?: v.BaseSchema<any, TData, any>;
  variablesSchema?: v.BaseSchema<any, TVariables, any>;
}) {
  return function useStandardQuery(variables: TVariables, options?: SWRConfiguration<TData>) {
    const key = config.queryKey(variables);

    // Run-time query variables validation if variablesSchema is provided
    if (config.variablesSchema && variables !== undefined) {
      const validation = v.safeParse(config.variablesSchema, variables);
      if (!validation.success) {
        throw new Error(`[Query Variables Validation Failed]: ${JSON.stringify(validation.issues)}`);
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
        const validation = v.safeParse(config.schema, swr.data);
        if (!validation.success) {
            console.error('[Query Data Validation Failed]:', validation.issues);
        }
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
