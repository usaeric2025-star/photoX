import { STALE_TIMES } from '@/lib/query/config';
import { createQuery } from '@/lib/query/queryFactory';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { queryKeys } from '@/lib/query/keys';
import { Category } from '@/types';

/**
 * Hook to get the list of categories using standard query factory.
 */
export const useCategories = createQuery<Category[]>({
  queryKey: () => queryKeys.categories.public(),
  staleTime: STALE_TIMES.SHORT* 5, // 5 minutes (more responsive)
  gcTime: 1000 * 60 * 30, // 30 minutes
  queryFn: async () => {
    const cats = await loadCategoriesFromCloud();
    // Sort consistently: first by sort_order, then by numeric/string ID as a fallback.
    const sortedCats = [...cats].sort((a, b) => {
      const orderA = a.sort_order !== undefined ? a.sort_order : Number(a.id);
      const orderB = b.sort_order !== undefined ? b.sort_order : Number(b.id);
      return orderA - orderB;
    });
    return sortedCats;
  }
});
