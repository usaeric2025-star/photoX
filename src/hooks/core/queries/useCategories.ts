import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';

/**
 * Hook to get the list of categories.
 */
export const useCategories = () => {
  const result = useQuery({
    queryKey: photoKeys.categories(),
    queryFn: async () => {
      const cats = await loadCategoriesFromCloud();
      syncCache.saveCategories(cats).catch(() => {});
      return cats;
    },
    staleTime: createStaleTime('INFINITY'),
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
