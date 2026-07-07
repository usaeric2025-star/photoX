import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { 
  QueryClient,
  QueryClientProvider,
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
import { get, set, del } from 'idb-keyval';
import { showToast } from '#lib/ui/toast.js';

export * from '@tanstack/react-query';

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
      const val = await get(key);
      return val === undefined ? null : val;
    },
    setItem: async (key, value) => {
      await set(key, value);
    },
    removeItem: async (key) => {
      await del(key);
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
        ErrorFactory.handle(error, { context: `useAppQuery: ${queryKey.join('-')}` });
        throw error;
      }
    },
    ...options,
    enabled,
  });
}

export function useAppInfiniteQuery<TData = unknown, TError = Error, TPageParam = unknown>(
  key: QueryKey | null,
  fetcherFn: (pageParam: TPageParam) => Promise<TData>,
  options: any
) {
  const queryKey = key === null ? ['__null__'] : (Array.isArray(key) ? key : [key]);
  const enabled = key !== null && options?.enabled !== false;

  return useInfiniteQuery<TData, TError, InfiniteData<TData>, QueryKey, TPageParam>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      try {
        return await fetcherFn(pageParam as TPageParam);
      } catch (error) {
        ErrorFactory.handle(error, { context: `useAppInfiniteQuery: ${queryKey.join('-')}` });
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
export function useAppMutation<TData = any, TVariables = any, TContext = any>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateKeys?: readonly (readonly any[])[];
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

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        showToast.success(successMessage);
      }
      
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key as any });
        });
      }

      if (onSuccess) {
        (onSuccess as any)(data, variables, context);
      }
    },
    onError: (err, variables, context) => {
      if (errorContext) {
        ErrorFactory.handle(err, { context: errorContext });
      }
      if (onError) {
        (onError as any)(err, variables, context);
      }
    },
    ...rest
  });
}

// Query Key Factory
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...photoKeys.lists(), filters] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
};

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...groupKeys.lists(), filters] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
};
