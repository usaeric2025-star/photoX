import { STALE_TIMES } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Tag } from '@/types';

/**
 * Perform server-side tag search with debounce handling (via queryKey)
 */
export const useTagSearch = (keyword: string) => {
  return useQuery({
    queryKey: ['tags', 'search', keyword],
    queryFn: async () => {
      const resp = await api.tags.search.$get({ query: { keyword } });
      const body = await resp.json();
      if (!body.success) {
        throw new Error(body.error || '搜索标签失败');
      }
      return body.data as Tag[];
    },
    enabled: keyword.length >= 0, // Allow empty keyword for initial listing if needed, or set to > 0
    staleTime: STALE_TIMES.SHORT
  });
};
