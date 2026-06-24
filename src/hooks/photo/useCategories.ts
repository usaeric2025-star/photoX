import { useAppQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { STALE_TIMES } from '@/lib/query/config';
import { CategoryListItemSchema } from '@api/_shared/apiContractSchema';
import * as v from 'valibot';

/**
 * Hook to get the list of categories.
 */
export function useCategories(appLang?: string) {
  // Using SWR for data fetching
  const { data, isLoading: isPending, error } = useAppQuery(
    queryKeys.categories.all,
    loadCategoriesFromCloud,
    {
      revalidateOnMount: true,
      dedupingInterval: STALE_TIMES.MEDIUM,
      schema: v.array(CategoryListItemSchema),
    }
  );
  return { data, isPending, error };
}


