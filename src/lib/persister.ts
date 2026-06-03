import { get, set, del } from 'idb-keyval';
import { PersistedClient } from '@tanstack/react-query-persist-client';

// 只持久化这些 key（读操作）
const PERSIST_KEYS = ['photos', 'groups', 'categories', 'tags', 'manufacturers'];

export function createIDBPersister({
  shouldPersist,
  maxAge = 7 * 24 * 60 * 60 * 1000, // 7 天
}: {
  shouldPersist?: (key: string) => boolean;
  maxAge?: number;
}) {
  return {
    persistClient: async (client: PersistedClient) => {
      // 过滤：只保留成功且在白名单内的 query
      const filteredQueries = client.clientState.queries.filter((q) => {
        const key = q.queryKey[0] as string;
        const isAllowed = PERSIST_KEYS.includes(key);
        const isSuccess = q.state.status === 'success';
        return isAllowed && isSuccess;
      });

      await set('queryClient', {
        ...client,
        clientState: { ...client.clientState, queries: filteredQueries },
        timestamp: Date.now(),
      });
    },
    restoreClient: async () => {
      const cached = await get<PersistedClient & { timestamp?: number }>('queryClient');
      if (!cached) return undefined;

      // 检查是否过期
      if (cached.timestamp && Date.now() - cached.timestamp > maxAge) {
        await del('queryClient');
        return undefined;
      }
      return cached;
    },
    removeClient: async () => {
      await del('queryClient');
    },
  };
}
