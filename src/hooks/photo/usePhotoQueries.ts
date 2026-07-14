import { useMemo } from 'react';
import { useAppInfiniteQuery, useAppQuery, photoKeys, keepPreviousData } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { mapSupabasePhoto } from '#src/utils/mappers/photo.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';
import { PhotoListItem } from '#shared/apiContractSchema.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '../core/index.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';
import { PhotoAIResult } from '#src/types/index.js';

export type PhotoListFilters = Record<string, unknown>;
export type PhotoListResponse = {
  items: PhotoListItem[];
  nextCursor: string | null;
  total: number;
};

export function usePhotos(params: PhotoListFilters = {}) {
  const { photoId, modal, anchor, ...fetchParams } = params;
  
  const result = useAppInfiniteQuery<PhotoListResponse, Error, string | undefined>(
    photoKeys.list(fetchParams),
    async (pageParam) => {
      return ErrorFactory.unwrap<PhotoListResponse>(
        api.photos.list.$post({ 
          json: { ...fetchParams, cursor: pageParam as string | undefined } 
        }),
        '獲取照片列表失敗'
      );
    },
    {
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      placeholderData: keepPreviousData,
    }
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, error } = result;

  const mappedData = useMemo(() => {
    if (!data?.pages) {
      return { pages: [] };
    }
    return {
      pages: data.pages.map((p) => ({ items: p.items, total: p.total }))
    };
  }, [data]);

  return {
    data: mappedData,
    isPending: isLoading,
    isFetching,
    isError: !!error,
    error,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    refetch: result.refetch,
  };
}

export const usePhoto = (photoId: string | null | undefined) => {
  const { t } = useTranslation();

  return useAppQuery(
    photoId ? photoKeys.detail(photoId) : null,
    async () => {
      if (!photoId) return null;
      
      const rawList = await ErrorFactory.unwrap<SupabasePhotoRaw[]>(
        api.photos['by-ids'].$post({
          json: { ids: [photoId] }
        }),
        t('fetchPhotoFailed')
      );
      
      const rawData = rawList[0];
      return rawData ? mapSupabasePhoto(rawData) : null;
    },
    {
      staleTime: STALE_TIMES.REALTIME,
    }
  );
};

export function usePhotoAIResult(photoId: string, options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = can('photo:ai-analyze') && (options?.enabled !== false);
  
  return useAppQuery<PhotoAIResult | null>(
    (photoId && isEnabled) ? ['photos', 'ai-result', photoId] : null,
    async (): Promise<PhotoAIResult | null> => {
      try {
        return await ErrorFactory.unwrap<PhotoAIResult>(
          api.admin.photos["photo-ai-result"][":photoId"].$get({
            param: { photoId }
          }),
          'AI Analysis Failed'
        ) || null;
      } catch (err: unknown) {
        throw ErrorFactory.wrap(err, 'Network Error', photoId);
      }
    },
    { 
      staleTime: STALE_TIMES.PHOTO_LIST,
      enabled: isEnabled
    }
  );
}
