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
    syncCache.saveCategories(cats).catch(() => {});
    return cats;
  }
});
