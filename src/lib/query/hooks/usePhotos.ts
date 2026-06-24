import useSWRInfinite from 'swr/infinite';
import { useSWRConfig } from 'swr';
import { queryKeys } from '../keys';
import { ErrorFactory } from '@/lib/error';
import { api } from '@/lib/api';
import { PhotoListItem } from '@/types/api';
import * as v from 'valibot';
import { PhotoListResSchema } from '@api/_shared/apiContractSchema';

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
      const response = await api.photos.list.$post({ json: fetchParams });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      
      // Validate the response
      return v.parse(PhotoListResSchema, result) as PhotoListResponse;
    },
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
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

export function usePhotosMutations() {
  const { mutate } = useSWRConfig();

  const updateCache = (updater: (data: unknown) => unknown) => {
    mutate(queryKeys.photos.all, updater, { revalidate: false });
  };

  const invalidate = () => {
    mutate(queryKeys.photos.all);
  };

  return { updateCache, invalidate };
}
