import { Tag } from '#src/types/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { loadTagsFromCloud } from '#src/services/tag/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';

export function useTags(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Tag[]>(
    isEnabled ? queryKeys.tags.list() : null,
    loadTagsFromCloud,
    {
      staleTime: STALE_TIMES.LONG,
    }
  );

  return {
    tags: data || [],
    isLoading,
    error,
    mutate: refetch,
  };
}

/**
 * Perform server-side tag search with debounce handling (via queryKey)
 */
export const useTagSearch = (keyword: string) => {
  return useAppQuery<Tag[]>(
    keyword.length >= 0 ? ['tags', 'search', keyword] : null,
    async () => {
      const resp = await api.tags.search.$get({ query: { keyword } });
      const body = await resp.json();
      if (!body.success) {
        throw new Error(body.error || '搜索标签失败');
      }
      return body.data as Tag[];
    },
    { staleTime: STALE_TIMES.SHORT }
  );
};
