import { useMemo } from 'react';
import { usePhotos } from './usePhotos.js';

export function usePhotoWall(filters?: Record<string, unknown>) {
  // ✅ 使用 useMemo 稳定 filters 引用
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
  }, [data]);

  const totalCount = data?.pages[0]?.total || 0;

  return {
    photos,
    total: totalCount,
    hasMore: hasNextPage,
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
    refresh: refetch,
    error: isError ? error : null,
  };
}

