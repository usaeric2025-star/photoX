import { createQuery } from './core/queryFactory';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { categoryKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';
import { Category } from '../types';

/**
 * Hook to get the list of categories using standard query factory.
 */
export const useCategories = createQuery<Category[]>({
  queryKey: () => categoryKeys.categories(),
  queryFn: async () => {
    const cats = await loadCategoriesFromCloud();
    // Sort consistently: first by sort_order, then by numeric/string ID as a fallback.
    const sortedCats = [...cats].sort((a, b) => {
      const orderA = a.sort_order !== undefined ? a.sort_order : Number(a.id);
      const orderB = b.sort_order !== undefined ? b.sort_order : Number(b.id);
      return orderA - orderB;
    });
    syncCache.saveCategories(sortedCats).catch(() => {});
    return sortedCats;
  }
});
