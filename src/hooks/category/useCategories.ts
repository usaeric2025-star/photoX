import { Category } from '#src/types/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { loadCategoriesFromCloud } from '#src/services/category/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';

export function useCategories(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Category[]>(
    isEnabled ? queryKeys.categories.list() : null,
    loadCategoriesFromCloud,
    {
      staleTime: STALE_TIMES.MEDIUM,
    }
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate: refetch,
  };
}
