import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadTagsFromCloud } from '../../services/tags';
import { photoKeys } from '../../lib/queryKeys';
import { syncCache } from '../../utils/indexedDB';

export const useTagsQuery = () => {
  const result = useQuery({
    queryKey: photoKeys.tags(),
    queryFn: async () => {
      const tags = await loadTagsFromCloud();
      syncCache.saveTags(tags).catch(() => {});
      return tags;
    },
    staleTime: createStaleTime('STABLE'), // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
