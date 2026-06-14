import { createQuery } from '@/lib/query/queryFactory';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { syncCache } from '@/lib/db/indexedDB';
import { Tag } from '@/types';

/**
 * Hook to get the list of tags using standard query factory.
 */
export const useTags = createQuery<Tag[]>({
  queryKey: () => queryKeys.tags.tags(),
  staleTime: 1000 * 60 * 60 * 24, // 24 hours (very stable)
  gcTime: 1000 * 60 * 60 * 24,
  queryFn: async () => {
    const tags = await loadTagsFromCloud();
    syncCache.saveTags(tags).catch(() => {});
    return tags;
  }
});
