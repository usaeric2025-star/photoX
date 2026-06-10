import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logError } from './error/errorLogger';
import { handleError } from './error/errorHandler';
import { createIDBPersister } from './persister';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // For global query errors, log to server and show detailed toast via handleError
      logError(error, { action: 'Query Failed', component: 'QueryClient', kind: 'NETWORK' });
      handleError(error, 'Query Failure');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Mutation failures are usually critical and need explicit detail copy
      if (error instanceof Error && !error.message.includes('401')) {
        logError(error, { action: 'Mutation Failed', component: 'QueryClient', kind: 'NETWORK' });
        handleError(error, 'Mutation Failure');
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
