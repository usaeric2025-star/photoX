import { Tag } from '@/types';
import { useAppQuery } from '@/lib/query';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/config';

export function useTags(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, mutate } = useAppQuery<Tag[]>(
    isEnabled ? queryKeys.tags.all : null,
    loadTagsFromCloud,
    {
      dedupingInterval: STALE_TIMES.LONG,
    }
  );

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  };
}
