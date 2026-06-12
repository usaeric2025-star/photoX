import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logError } from '@/services/system/logService';
import { handleError } from './error/errorHandler';
import { createIDBPersister } from './persister';

const querySyncChannel = new BroadcastChannel('photo-x-query-sync');

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      logError(error, { action: 'Query Failed', component: 'QueryClient', kind: 'NETWORK' });
      handleError(error, 'Query Failure');
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      // Sync invalidation across tabs for mutations
      const queryKey = mutation.options.mutationKey;
      if (queryKey) {
          querySyncChannel.postMessage({ type: 'invalidate', queryKey });
      }
    },
    onError: (error) => {
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
      refetchOnMount: true,
    },
  },
});

querySyncChannel.onmessage = (event) => {
  if (event.data?.type === 'invalidate' && event.data.queryKey) {
    queryClient.invalidateQueries({ queryKey: event.data.queryKey });
  }
};

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
