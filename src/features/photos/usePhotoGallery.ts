import { useInfinitePhotos } from '@/hooks/queries/usePhotos';
import { useFilters } from '@/features/filters/useFilters';
import { cleanPhotos } from '@/lib/filters';
import { PAGINATION } from '@/constants/config';
import { useMemo, useEffect } from 'react';
import { useGalleryStore } from '@/store';

export function usePhotoGallery() {
  const { filters } = useFilters();
  const sortOrder = useGalleryStore(s => s.sortOrder);
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const pageSize = isAdminPath ? 60 : 20;  // Use fixed numeric sizes to avoid import/rebuild side effects

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filters.categoryId,
    tag_id: filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: sortOrder || 'newest',
    isAdminMode: true,
  }, pageSize, true);  // enabled is explicitly true

  // Detailed debug logging
  console.log('📸 usePhotoGallery 调用:', {
    filters: filters,
    pageSize,
    isLoading: infinitePhotosQuery.isLoading,
    dataLength: infinitePhotosQuery.data?.pages?.flatMap(p => p.photos)?.length
  });

  // Debug log to ensure execution
  useEffect(() => {
    console.log('[DEBUG] usePhotoGallery query executed:', {
      status: infinitePhotosQuery.status,
      fetchStatus: infinitePhotosQuery.fetchStatus,
      dataLength: infinitePhotosQuery.data?.pages.length
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
    refetch: () => infinitePhotosQuery.refetch(),
  };
}
