import { usePhotos, useUrlFilters } from '@/hooks';
import { cleanPhotos } from '@/lib/filters';
import { PAGINATION } from '@/constants/config';
import { useMemo, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';

export function usePhotoGallery() {
  logger.debug('📸 usePhotoGallery 被调用');

  const { filters: urlFilters } = useUrlFilters();
  logger.debug('📸 urlFilters:', urlFilters);

  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const pageSize = isAdminPath ? PAGINATION.ADMIN_BATCH_SIZE : 20;

  const infinitePhotosQuery = usePhotos({
    category_id: urlFilters.categoryId,
    tag_id: urlFilters.tagId,
    searchQuery: urlFilters.searchQuery,
    sortOrder: urlFilters.sortOrder || 'newest',
    isAdminMode: isAdminPath,
    is_hidden: urlFilters.is_hidden, 
    manufacturer_id: urlFilters.manufacturerId,
  }, pageSize, true);  // enabled is explicitly true

  logger.debug('📸 useInfinitePhotos 状态:', {
    isLoading: infinitePhotosQuery.isLoading,
    status: infinitePhotosQuery.status,
    error: (infinitePhotosQuery as any).error?.message
  });

  // Detailed debug logging
  logger.debug('📸 usePhotoGallery 详细状态:', {
    urlFilters: urlFilters,
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
