import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { reportError } from './errorTracker';
import { createIDBPersister } from './persister';

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
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

// 创建持久化实例
export const persister = createIDBPersister({
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

/**
 * 清除持久化缓存（通常用于登出）
 */
export const clearPersistence = async () => {
  if (persister.removeClient) {
    await persister.removeClient();
  }
  queryClient.clear();
};
