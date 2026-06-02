import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';

interface UseCategoriesOptions {
  enabled?: boolean;
}

/**
 * Hook to get the list of categories.
 */
export const useCategories = (options?: UseCategoriesOptions) => {
  const result = useQuery({
    queryKey: photoKeys.categories(),
    queryFn: async () => {
      const cats = await loadCategoriesFromCloud();
      syncCache.saveCategories(cats).catch(() => {});
      return cats;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
  return { ...result, data: result.data ?? [] };
};
