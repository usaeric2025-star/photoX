import { STALE_TIMES } from '@/lib/query/config';
import { createQuery } from '@/lib/query/queryFactory';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { Tag } from '@/types';
import { CACHE_CONFIG } from '@/constants/config';

/**
 * Hook to get the list of tags using standard query factory.
 */
export const useTags = createQuery<Tag[]>({
  queryKey: () => queryKeys.tags.tags(),
  staleTime: STALE_TIMES.MEDIUM,
  gcTime: CACHE_CONFIG.GC_TIME_30M,
  queryFn: async () => {
    return await loadTagsFromCloud();
  }
});
