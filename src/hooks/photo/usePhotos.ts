import { useAppInfiniteQuery, photoKeys, keepPreviousData } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { PhotoListItem } from '#src/types/api.js';

export type PhotoListFilters = Record<string, unknown>;

type PhotoListResponse = {
  success: boolean;
  data: PhotoListItem[];
  nextCursor: string | null;
  total: number;
};

export function usePhotos(params: PhotoListFilters = {}) {
  const { photoId, modal, anchor, ...fetchParams } = params;

  const result = useAppInfiniteQuery<PhotoListResponse, Error, string | undefined>(
    photoKeys.list(fetchParams),
    async (pageParam) => {
      const response = await api.photos.list.$post({ 
        json: { ...fetchParams, cursor: pageParam as string | undefined } 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as PhotoListResponse;
    },
    {
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      placeholderData: keepPreviousData,
    }
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, error } = result;

  return {
    data: { pages: data?.pages.map(p => ({ items: p.data, total: p.total })) || [] },
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
