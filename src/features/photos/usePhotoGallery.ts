import { usePhotos, useUrlFilters } from '@/hooks';
import { useFilters } from '@/features/filters/useFilters';
import { cleanPhotos } from '@/lib/filters';
import { PAGINATION } from '@/constants/config';
import { useMemo, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';

export function usePhotoGallery() {
  logger.debug('📸 usePhotoGallery 被调用');

  const { filters } = useFilters();
  const { filters: urlFilters } = useUrlFilters();
  logger.debug('📸 filters:', filters);

  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const pageSize = isAdminPath ? PAGINATION.ADMIN_BATCH_SIZE : 20;

  const infinitePhotosQuery = usePhotos({
    category_id: filters.categoryId,
    tag_id: filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: urlFilters.sortOrder || 'newest',
    isAdminMode: true,
  }, pageSize, true);  // enabled is explicitly true

  logger.debug('📸 useInfinitePhotos 状态:', {
    isLoading: infinitePhotosQuery.isLoading,
    status: infinitePhotosQuery.status,
    error: (infinitePhotosQuery as any).error?.message
  });

  // Detailed debug logging
  logger.debug('📸 usePhotoGallery 详细状态:', {
    filters: filters,
    pageSize,
    isLoading: infinitePhotosQuery.isLoading,
    dataLength: infinitePhotosQuery.data?.pages?.flatMap(p => p.photos)?.length
  });

  // Debug log to ensure execution
  useEffect(() => {
    logger.debug('[DEBUG] usePhotoGallery query executed:', {
      status: infinitePhotosQuery.status,
      fetchStatus: infinitePhotosQuery.fetchStatus,
      dataLength: infinitePhotosQuery.data?.pages?.length
    });
  }, [infinitePhotosQuery.status, infinitePhotosQuery.fetchStatus, infinitePhotosQuery.data]);

  const photos = useMemo(
    () => cleanPhotos(infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || []),
    [infinitePhotosQuery.data]
  );

  return {
    photos,
    infinitePhotosQuery, // Export the actual query object
    isLoading: infinitePhotosQuery.isLoading,
    isFetching: infinitePhotosQuery.isFetching,
    hasNextPage: infinitePhotosQuery.hasNextPage,
    loadMore: () => infinitePhotosQuery.fetchNextPage(),
    refetch: () => queryClient.invalidateQueries({ queryKey: photoKeys.all }),
  };
}
