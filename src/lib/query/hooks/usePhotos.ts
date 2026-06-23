import useSWRInfinite from 'swr/infinite';
import { useSWRConfig } from 'swr';
import { queryKeys } from '../keys';
import { ErrorFactory } from '@/lib/error';
import { api } from '@/lib/api';
import { PhotoListItem } from '@/types/api';

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
    
    // Add pagination params
    const queryParams = {
      ...params,
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
      return result as PhotoListResponse;
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

  const updateCache = (updater: (data: any) => any) => {
    mutate(queryKeys.photos.all, updater, { revalidate: false });
  };

  const invalidate = () => {
    mutate(queryKeys.photos.all);
  };

  return { updateCache, invalidate };
}
