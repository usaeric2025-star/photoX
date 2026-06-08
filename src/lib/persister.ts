import { get, set, del } from 'idb-keyval';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { supabase } from './supabase';

const PERSIST_VERSION = 1; // [CACHE-VERSIONING]
const PERSIST_KEYS = ['photos', 'groups', 'categories', 'tags', 'manufacturers'];

/**
 * 获取当前用户的存储 Key
 */
async function getStoreKey() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id ?? 'anonymous';
  return `PhotoX_QueryCache_${userId}`;
}

export function createIDBPersister({
  maxAge = 7 * 24 * 60 * 60 * 1000,
}: {
  maxAge?: number;
} = {}): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const key = await getStoreKey();
      
      const filteredQueries = client.clientState.queries.filter((q) => {
        const queryKey = q.queryKey[0] as string;
        const isAllowed = PERSIST_KEYS.includes(queryKey);
        const isSuccess = q.state.status === 'success';
        return isAllowed && isSuccess;
      });

      await set(key, {
        ...client,
        clientState: { ...client.clientState, queries: filteredQueries },
        timestamp: Date.now(),
        version: PERSIST_VERSION, // 写入版本号
      });
    },
    restoreClient: async () => {
      const key = await getStoreKey();
      const cached = await get<PersistedClient & { timestamp?: number; version?: number }>(key);
      
      if (!cached) return undefined;

      // 1. 检查版本 [SCHEMA-MIGRATION-PROTECTION]
      if (cached.version !== PERSIST_VERSION) {
        console.warn(`[Persistence] Version mismatch (Cached: ${cached.version}, App: ${PERSIST_VERSION}). Clearing cache.`);
        await del(key);
        return undefined;
      }

      // 2. 检查过期
      if (cached.timestamp && Date.now() - cached.timestamp > maxAge) {
        console.info('[Persistence] Cache expired. Clearing.');
        await del(key);
        return undefined;
      }

      return cached;
    },
    removeClient: async () => {
      const key = await getStoreKey();
      await del(key);
    },
  };
}
