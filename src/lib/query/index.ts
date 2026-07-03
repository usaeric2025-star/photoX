import { 
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey
} from '@tanstack/react-query';

export * from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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

/**
 * Standard data fetching hook (Legacy wrapper for compatibility)
 */
export function useAppQuery<TData = any, TError = Error>(
  key: QueryKey | null,
  fetcherFn: (...args: any[]) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  const queryKey = key === null ? ['__null__'] : (Array.isArray(key) ? key : [key]);
  const enabled = key !== null && options?.enabled !== false;

  return useQuery<TData, TError>({
    queryKey,
    queryFn: () => fetcherFn(...queryKey),
    ...options,
    enabled,
  });
}

/**
 * Standard mutation hook (Legacy wrapper for compatibility)
 */
export function useAppMutation<TVariables = any, TData = any, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation<TData, TError, TVariables>(options);
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
