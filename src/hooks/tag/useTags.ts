import { Tag, AppSettings } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import { useInvalidatePhotos } from '#src/hooks/photo/usePhotos.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';

export function useTags(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Tag[]>(
    isEnabled ? queryKeys.tags.list() : null,
    async () => {
      const res = await api.tags.$get();
      const json = await res.json() as unknown as ApiResponse<Tag[]>;
      if (json.success && json.data) return json.data;
      throw new Error(json.error || 'Failed to load tags');
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
      const body = await resp.json() as unknown as ApiResponse<Tag[]>;
      if (!body.success || !body.data) {
        throw new Error(body.error || '搜索标签失败');
      }
      return body.data;
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
      const json = await res.json() as unknown as ApiResponse<Tag>;
      if (json.success && json.data) return json.data;
      throw new Error(json.error || '標籤創建失敗');
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
      const json = await res.json() as ApiResponse<boolean>;
      if (json.success) return true;
      throw new Error(json.error || '標籤更新失敗');
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
      const json = await res.json() as ApiResponse<boolean>;
      if (json.success) return true;
      throw new Error(json.error || '標籤刪除失敗');
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

/**
 * useTagSorting
 * 處理標籤的排序與顯示邏輯，包括置頂標籤與熱門標籤。
 */
export function useTagSorting(tags: Tag[], settings?: AppSettings) {
  const pinnedIds = (settings?.pinnedTags || []).map(id => String(id));

  const hotIds = (() => {
    const hotTagsCount = settings?.hotTagsCount ?? 9;
    const hotTagThreshold = Number(settings?.hotTagThreshold ?? 0);

    const candidates = tags
      .filter(tag => !pinnedIds.includes(String(tag.id)))
      .map(tag => ({
        ...tag,
        hotScore: tag.hotScore || 0
      }))
      .filter(tag => (tag.hotScore || 0) >= hotTagThreshold && (tag.hotScore || 0) > 0);

    const sorted = [...candidates].sort((a, b) => {
      const diff = (b.hotScore || 0) - (a.hotScore || 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    const hot = sorted.slice(0, hotTagsCount);
    return new Set(hot.map(t => String(t.id)));
  })();

  const tagsToRender = [...tags].sort((a, b) => {
    const aPinned = !!a.isPinned || pinnedIds.includes(String(a.id));
    const bPinned = !!b.isPinned || pinnedIds.includes(String(b.id));
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const aHot = hotIds.has(String(a.id));
    const bHot = hotIds.has(String(b.id));
    if (aHot && !bHot) return -1;
    if (!aHot && bHot) return 1;
    
    const countA = a.hotScore || 0;
    const countB = b.hotScore || 0;
    return countB - countA || (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });

  return { tagsToRender, pinnedIds, hotIds };
}
