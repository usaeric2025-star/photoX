import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadTagsFromCloud } from '../../services/tagService';
import { QUERY_KEYS } from './keys';
import { syncCache } from '../../utils/indexedDB';

export const useTagsQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: async () => {
      const tags = await loadTagsFromCloud();
      syncCache.saveTags(tags).catch(() => {});
      return tags;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
