import { Tag } from '#src/types/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { loadTagsFromCloud } from '#src/services/tag/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';

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
