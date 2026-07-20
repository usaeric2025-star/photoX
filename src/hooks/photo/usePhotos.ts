import { useCallback } from 'react';
import { useQueryClient, useInfiniteQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { queryKeys } from '#lib/query/keys.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { STALE_TIMES } from '#lib/query/config.js';

/**
 * useInvalidatePhotos
 */
export function useInvalidatePhotos() {
  const queryClient = useQueryClient();

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.lists() });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, [queryClient]);

  const invalidateDetail = useCallback((id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(id) });
  }, [queryClient]);

  const invalidateTags = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
  }, [queryClient]);

  const invalidateGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, [queryClient]);

  return { invalidateList, invalidateAll, invalidateDetail, invalidateTags, invalidateGroups };
}

/**
 * usePhotos
 * 獲取照片列表（支援分頁、篩選、搜尋）。
 */
export function usePhotos(params: any = {}) {
  const { uiTranslations: labels } = useTranslation();

  return useInfiniteQuery({
    queryKey: queryKeys.photos.list(params),
    queryFn: async ({ pageParam = 1 }) => {
      // @ts-ignore - Hono client indexing
      const res = await api.photo.$get({ 
        query: { ...params, page: String(pageParam), limit: '24' } 
      });
      return ErrorFactory.unwrap<any>(res, labels.pullFail || 'Fetch Failed');
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: STALE_TIMES.MEDIUM,
  });
}

/**
 * usePhotoDetail
 */
export function usePhotoDetail(id: string | null) {
  const { uiTranslations: labels } = useTranslation();

  return useAppQuery(
    queryKeys.photos.detail(id || ''),
    async () => {
      if (!id) return null;
      // @ts-ignore - Hono client indexing
      const res = await api.photo[':id'].$get({ param: { id } });
      return ErrorFactory.unwrap<any>(res, labels.pullFail || 'Fetch Failed');
    },
    { 
      enabled: !!id,
      staleTime: STALE_TIMES.LONG 
    }
  );
}

// Alias
export const usePhoto = usePhotoDetail;
