import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';

/**
 * Hook to get the list of tags.
 */
export const useTagList = () => {
  const result = useQuery({
    queryKey: photoKeys.tags(),
    queryFn: async () => {
      const tags = await loadTagsFromCloud();
      syncCache.saveTags(tags).catch(() => {});
      return tags;
    },
    staleTime: createStaleTime('STABLE'),
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
