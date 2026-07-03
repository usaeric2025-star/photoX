import { useInfiniteQuery, photoKeys, keepPreviousData } from '#lib/query/index.js';
import { ErrorFactory } from '#lib/error/index.js';
import { api } from '#lib/api.js';
import { PhotoListItem } from '#src/types/api.js';
import * as v from 'valibot';
import { PhotoListResSchema } from '#shared/apiContractSchema.js';
import { logger } from '#lib/logger.js';

export type PhotoListFilters = Record<string, unknown>;

type PhotoListResponse = {
  success: boolean;
  data: PhotoListItem[];
  nextCursor: string | null;
  total: number;
};

export function usePhotos(params: PhotoListFilters = {}) {
  const { photoId, modal, anchor, ...fetchParams } = params;

  const result = useInfiniteQuery({
    queryKey: photoKeys.list(fetchParams),
    queryFn: async ({ pageParam }) => {
      const response = await api.photos.list.$post({ 
        json: { ...fetchParams, cursor: pageParam as string | undefined } 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as PhotoListResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    placeholderData: keepPreviousData,
  });

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
