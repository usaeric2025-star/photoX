import { useMemo } from 'react';
import { usePhotos } from '#lib/query/hooks/usePhotos.js';

export function usePhotoWall(filters?: Record<string, unknown>) {
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
  } = usePhotos(filters);

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

