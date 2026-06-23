import { useAppQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { STALE_TIMES } from '@/lib/query/config';

/**
 * Hook to get the list of tags.
 */
export function useTags() {
  // Using SWR for data fetching
  const { data, isLoading: isPending, error } = useAppQuery(
    queryKeys.tags.all,
    loadTagsFromCloud,
    {
      revalidateOnMount: true,
      dedupingInterval: STALE_TIMES.MEDIUM, 
    }
  );
  return { data, isPending, error };
}

