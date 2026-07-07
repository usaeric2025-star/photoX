import { Tag } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';

export function useTags(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Tag[]>(
    isEnabled ? queryKeys.tags.list() : null,
    async () => {
      const res = await api.tags.$get();
      const json = await res.json();
      if (json.success) return json.data as Tag[];
      throw new Error((json as any).error?.message || 'Failed to load tags');
    },
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

export function useTagMutations() {
  const { invalidateTags, invalidateList } = useInvalidatePhotos();
  const invalidateKeys = [queryKeys.tags.list()];

  const create = useAppMutation({
    mutationFn: async (variables: string | Partial<Tag>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      const res = await api.tags.$post({
        json: {
          tagData: {
            name,
            isPinned: false
          }
        }
      });
      const json = await res.json();
      if (json.success) return json.data as Tag;
      throw new Error((json as any).error?.message || '標籤創建失敗');
    },
    invalidateKeys,
    errorContext: 'tag-create',
    successMessage: '標籤已創建',
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Tag> }) => {
      const res = await api.tags[':id'].$put({
        param: { id: String(id) },
        json: { updates }
      });
      const json = await res.json();
      if (json.success) return true;
      throw new Error((json as any).error?.message || '標籤更新失敗');
    },
    invalidateKeys,
    errorContext: 'tag-edit',
    successMessage: '標籤已更新',
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });

  const remove = useAppMutation({
    mutationFn: async (id: number) => {
      const res = await api.tags[':id'].$delete({
        param: { id: String(id) }
      });
      const json = await res.json();
      if (json.success) return true;
      throw new Error((json as any).error?.message || '標籤刪除失敗');
    },
    invalidateKeys,
    errorContext: 'tag-delete',
    successMessage: '標籤已刪除',
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });

  return { create, edit, remove };
}
