import { Category } from '#src/types';
import { useAppQuery } from '#lib/query';
import { loadCategoriesFromCloud } from '#src/services/category/queries';
import { queryKeys } from '#lib/query/keys';
import { STALE_TIMES } from '#lib/query/config';

export function useCategories(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, mutate } = useAppQuery<Category[]>(
    isEnabled ? queryKeys.categories.all : null,
    loadCategoriesFromCloud,
    {
      dedupingInterval: STALE_TIMES.MEDIUM,
    }
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}
