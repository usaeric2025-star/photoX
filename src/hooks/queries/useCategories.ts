import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '../../services/categories';
import { photoKeys } from '../../lib/queryKeys';
import { syncCache } from '../../utils/indexedDB';

export const useCategoriesQuery = () => {
  const result = useQuery({
    queryKey: photoKeys.categories(),
    queryFn: async () => {
      const cats = await loadCategoriesFromCloud();
      syncCache.saveCategories(cats).catch(() => {});
      return cats;
    },
    staleTime: createStaleTime('STABLE'), // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
