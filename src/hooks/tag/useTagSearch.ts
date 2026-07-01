import { STALE_TIMES } from '#lib/query/config';
import { useAppQuery } from '#lib/query';
import { api } from '#lib/api';
import { Tag } from '#src/types';

/**
 * Perform server-side tag search with debounce handling (via queryKey)
 */
export const useTagSearch = (keyword: string) => {
  return useAppQuery(
    keyword.length >= 0 ? ['tags', 'search', keyword] : null,
    async () => {
      const resp = await api.tags.search.$get({ query: { keyword } });
      const body = await resp.json();
      if (!body.success) {
        throw new Error(body.error || '搜索标签失败');
      }
      return body.data as Tag[];
    },
    { dedupingInterval: STALE_TIMES.SHORT }
  );
};
