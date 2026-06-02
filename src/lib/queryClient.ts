import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { reportError } from './errorTracker';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      reportError(error, 'Query');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof Error && !error.message.includes('401')) {
        reportError(error, 'Mutation');
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // 翻页时保留旧数据
      // @ts-ignore
      placeholderData: (previousData: unknown) => previousData,
    },
  },
});
