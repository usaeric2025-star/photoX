import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { 
  QueryClient,
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type InfiniteData
} from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import * as idb from 'idb-keyval';
import { feedback } from '#lib/feedback.js';

export * from '@tanstack/react-query';
export * from './keys.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes default
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const asyncPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const val = await idb.get(key);
      return val === undefined ? null : val;
    },
    setItem: async (key, value) => {
      await idb.set(key, value);
    },
    removeItem: async (key) => {
      await idb.del(key);
    },
  },
});

/**
 * Standard data fetching hook
 */
export function useAppQuery<TData = unknown, TError = Error>(
  key: QueryKey | null,
  fetcherFn: (...args: unknown[]) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  const queryKey = key === null ? ['__null__'] : (Array.isArray(key) ? key : [key]);
  const enabled = key !== null && options?.enabled !== false;

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        return await fetcherFn(...queryKey);
      } catch (error) {
        throw error;
      }
    },
    ...options,
    enabled,
  });
}

function useAppInfiniteQuery<TData = unknown, TError = Error, TPageParam = unknown>(
  key: QueryKey | null,
  fetcherFn: (pageParam: TPageParam) => Promise<TData>,
  options: Omit<UseInfiniteQueryOptions<TData, TError, InfiniteData<TData>, QueryKey, TPageParam>, 'queryKey' | 'queryFn'>
) {
  const queryKey = key === null ? ['__null__'] : (Array.isArray(key) ? key : [key]);
  const enabled = key !== null && options?.enabled !== false;

  return useInfiniteQuery<TData, TError, InfiniteData<TData>, QueryKey, TPageParam>({
    queryKey: queryKey as QueryKey,
    queryFn: async ({ pageParam }) => {
      try {
        return await fetcherFn(pageParam as TPageParam);
      } catch (error) {
        throw error;
      }
    },
    ...options,
    enabled,
  });
}

/**
 * Standard mutation hook
 */
export function useAppMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateKeys?: QueryKey[];
    successMessage?: string;
    errorContext?: string;
  } & Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const { 
    mutationFn,
    invalidateKeys, 
    successMessage, 
    errorContext, 
    onSuccess, 
    onError,
    ...rest 
  } = options;

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn,
    onSuccess: (...args) => {
      if (successMessage) {
        feedback.success(successMessage);
      }
      
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      if (onSuccess) {
        onSuccess(...args);
      }
    },
    onError: (error, ...args) => {
      if (errorContext) {
        ErrorFactory.handle(error, { context: errorContext });
      }
      if (onError) {
        onError(error, ...args);
      }
    },
    ...rest
  });
}
