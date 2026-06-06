import { createQuery } from './core/queryFactory';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { tagKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';
import { Tag } from '../types';

/**
 * Hook to get the list of tags using standard query factory.
 */
export const useTags = createQuery<Tag[]>({
  queryKey: () => tagKeys.tags(),
  queryFn: async () => {
    const tags = await loadTagsFromCloud();
    syncCache.saveTags(tags).catch(() => {});
    return tags;
  }
});
