import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '../../services/categoryService';
import { QUERY_KEYS } from './keys';
import { syncCache } from '../../utils/indexedDB';

export const useCategoriesQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const cats = await loadCategoriesFromCloud();
      syncCache.saveCategories(cats).catch(() => {});
      return cats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
