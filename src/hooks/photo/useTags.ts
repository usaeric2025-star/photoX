import { createQuery } from '@/lib/query/queryFactory';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { syncCache } from '@/lib/db/indexedDB';
import { Tag } from '@/types';
import { CACHE_CONFIG } from '@/constants/config';

/**
 * Hook to get the list of tags using standard query factory.
 */
export const useTags = createQuery<Tag[]>({
  queryKey: () => queryKeys.tags.tags(),
  staleTime: CACHE_CONFIG.STALE_TIME_5M,
  gcTime: CACHE_CONFIG.GC_TIME_30M,
  queryFn: async () => {
    const tags = await loadTagsFromCloud();
    syncCache.saveTags(tags).catch(() => {});
    return tags;
  }
});
