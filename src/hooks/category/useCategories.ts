import { Category } from '@/types';
import { useAppQuery } from '@/lib/query';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { queryKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/config';

export function useCategories() {
  const { data, isLoading, error, mutate } = useAppQuery<Category[]>(
    queryKeys.categories.all,
    loadCategoriesFromCloud,
    {
      dedupingInterval: STALE_TIMES.LONG,
    }
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}
