import useSWRInfinite from 'swr/infinite';
import { useSWRConfig } from 'swr';
import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error';
import { api } from '@/lib/api';
import { PhotoListItem } from '@/types/api';
import * as v from 'valibot';
import { PhotoListResSchema } from '@shared/apiContractSchema';

export type PhotoListFilters = Record<string, unknown>;

type PhotoListResponse = {
  success: boolean;
  data: PhotoListItem[];
  nextCursor: string | null;
  total: number;
};

export function usePhotos(params: PhotoListFilters = {}) {
  const getKey = (pageIndex: number, previousPageData: PhotoListResponse | null) => {
    // If we've reached the end, return null
    if (previousPageData && !previousPageData.nextCursor) return null;
    
    // Filter out UI-only parameters that shouldn't trigger a re-fetch of the list
    const { photoId, modal, anchor, ...fetchParams } = params;
    
    // Add pagination params
    const queryParams = {
      ...fetchParams,
      cursor: previousPageData ? previousPageData.nextCursor : undefined,
    };
    
    // Convert to a stable key string for SWR
    // SWRInfinite expects a string, array, or null
    return [ 'photos', 'list', queryParams ];
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<PhotoListResponse>(
    getKey,
    async ([_p, _l, fetchParams]) => {
      logger.debug('--- [SWR Fetch] Start with params:', fetchParams);
      try {
        const response = await api.photos.list.$post({ json: fetchParams });
        logger.debug('--- [SWR Fetch] Response status:', response.status);
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          const rawMsg = errData?.error?.message || errData?.message || errData?.error || `HTTP ${response.status}`;
          const err = new Error(typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg));
          if (errData) Object.assign(err, errData);
          throw err;
        }
        const result = await response.json();
        logger.debug('--- [SWR Fetch] JSON received, item count:', result?.data?.length);
        
        // Validate the response
        const parsed = v.parse(PhotoListResSchema, result) as PhotoListResponse;
        logger.debug('--- [SWR Fetch] Validation success, parsed:', parsed.data.length);
        return parsed;
      } catch (err: unknown) {
        logger.error('--- [SWR Fetch] Error:', err);
        throw err;
      }
    },
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const hasNextPage = data ? !!data[data.length - 1]?.nextCursor : false;
  const isFetchingNextPage = Boolean(isLoading || (size > 0 && data && typeof data[size - 1] === "undefined"));

  return {
    data: { pages: data?.map(p => ({ items: p.data, total: p.total })) || [] },
    isPending: Boolean(isLoading),
    isFetching: Boolean(isValidating),
    isError: !!error,
    error,
    fetchNextPage: () => setSize(size + 1),
    hasNextPage,
    isFetchingNextPage,
    refetch: mutate,
  };
}

import { mutate as globalMutate } from 'swr';
import { logger } from '@/lib/logger';

/**
 * 預加載特定篩選條件的照片列表第一頁並寫入 SWR 快取
 */
export async function prefetchPhotos(params: PhotoListFilters = {}) {
  const { photoId, modal, anchor, ...fetchParams } = params;
  const queryParams = {
    ...fetchParams,
    cursor: undefined,
  };
  const key = [ 'photos', 'list', queryParams ];
  
  try {
    globalMutate(key, async () => {
      const response = await api.photos.list.$post({ json: fetchParams });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const err = new Error(errData?.error || errData?.message || `HTTP ${response.status}`);
        if (errData) Object.assign(err, errData);
        throw err;
      }
      const result = await response.json();
      return v.parse(PhotoListResSchema, result) as PhotoListResponse;
    }, { revalidate: false });
  } catch (e) {
    logger.warn('[prefetchPhotos] Failed to prefetch', e);
  }
}

function usePhotosMutations() {
  const { mutate } = useSWRConfig();

  const updateCache = (updater: (data: unknown) => unknown) => {
    mutate(queryKeys.photos.all, updater, { revalidate: false });
  };

  const invalidate = () => {
    mutate(queryKeys.photos.all);
  };

  return { updateCache, invalidate };
}
