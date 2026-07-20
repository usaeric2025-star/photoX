import { useCallback, useMemo } from 'react';
import { useQueryClient, useInfiniteQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { queryKeys } from '#lib/query/keys.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { useFilters } from './useFilters.js';

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
 * 整合了 useFilters 作為精準定位的參數來源。
 */
export function usePhotos(params: any = {}) {
  const { uiTranslations: labels } = useTranslation();
  const { filters } = useFilters();
  
  const limit = params.limit || 24;

  const query = useInfiniteQuery({
    queryKey: queryKeys.photos.list({ ...filters, ...params, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      // @ts-ignore - Hono client indexing
      const res = await api.photos.list.$post({ 
        json: { 
          ...filters,
          ...params,
          page: String(pageParam), 
          limit: String(limit) 
        } 
      });
      return ErrorFactory.unwrap<any>(res, labels.pullFail || 'Fetch Failed');
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items || lastPage.items.length === 0) return undefined;
      const total = Number(lastPage.total) || 0;
      const page = Number(lastPage.page) || 1;
      const totalPages = Math.ceil(total / limit);
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: STALE_TIMES.MEDIUM,
  });

  return {
    ...query,
    photos: query.data?.pages.flatMap(page => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    filters
  };
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
      const res = await api.photos[':id'].$get({ param: { id } });
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
