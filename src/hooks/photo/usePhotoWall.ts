import { useMemo } from 'react';
import { usePhotos } from './usePhotoQueries.js';

/**
 * usePhotoWall
 * 
 * 為照片牆（網格/列表）提供扁平化的數據接口。
 * 處理分頁展開與篩選器的緩衝。
 */
export function usePhotoWall(filters?: Record<string, unknown>) {
  const stableFilters = useMemo(() => filters || {}, [JSON.stringify(filters)]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePhotos(stableFilters);

  const photos = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data?.pages]);

  const total = data?.pages[0]?.total || 0;

  return {
    photos,
    total,
    isLoading: isPending,
    isFetching,
    isError,
    error,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    refresh: refetch,
  };
}
