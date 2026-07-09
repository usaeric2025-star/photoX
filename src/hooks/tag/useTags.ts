import { Tag, AppSettings } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import { useInvalidatePhotos } from '#src/hooks/photo/usePhotos.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';
import { useTranslation } from '#src/hooks/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export function useTags(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Tag[]>(
    isEnabled ? queryKeys.tags.list() : null,
    async () => ErrorFactory.unwrap<Tag[]>(api.tags.$get(), 'Failed to load tags'),
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
  const { t } = useTranslation();
  return useAppQuery<Tag[]>(
    keyword.length >= 0 ? ['tags', 'search', keyword] : null,
    async () => ErrorFactory.unwrap<Tag[]>(
      api.tags.search.$get({ query: { keyword } }),
      t('searchTagFailed')
    ),
    { staleTime: STALE_TIMES.SHORT }
  );
};

export function useTagMutations() {
  const { t } = useTranslation();
  const { invalidateTags, invalidateList } = useInvalidatePhotos();
  const invalidateKeys = [queryKeys.tags.list()];

  const create = useAppMutation({
    mutationFn: async (variables: string | Partial<Tag>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      return ErrorFactory.unwrap<Tag>(
        api.tags.$post({
          json: {
            tagData: {
              name,
              isPinned: false
            }
          }
        }),
        t('tagCreateFailed')
      );
    },
    invalidateKeys,
    errorContext: 'tag-create',
    successMessage: t('tagCreated'),
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Tag> }) => {
      return ErrorFactory.unwrap<boolean>(
        api.tags[':id'].$put({
          param: { id: String(id) },
          json: { updates }
        }),
        t('tagUpdateFailed')
      );
    },
    invalidateKeys,
    errorContext: 'tag-edit',
    successMessage: t('tagUpdated'),
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });

  const remove = useAppMutation({
    mutationFn: async (id: number) => {
      return ErrorFactory.unwrap<boolean>(
        api.tags[':id'].$delete({
          param: { id: String(id) }
        }),
        t('tagDeleteFailed')
      );
    },
    invalidateKeys,
    errorContext: 'tag-delete',
    successMessage: t('tagDeleted'),
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
