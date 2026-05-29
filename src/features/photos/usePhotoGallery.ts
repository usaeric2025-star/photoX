import { useInfinitePhotos } from '@/hooks/queries/usePhotos';
import { useFilters } from '@/features/filters/useFilters';
import { cleanPhotos } from '@/lib/filters';
import { PAGINATION } from '@/constants/config';
import { useMemo } from 'react';

export function usePhotoGallery() {
  const { filters } = useFilters();
  const isAdminPath = window.location.pathname.startsWith('/admin');

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filters.categoryId,
    tag_id: filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: 'newest',
    isAdminMode: true,
  }, isAdminPath ? PAGINATION.ADMIN_BATCH_SIZE : 1, true);

  const photos = useMemo(
    () => cleanPhotos(infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || []),
    [infinitePhotosQuery.data]
  );

  return {
    photos,
    isLoading: infinitePhotosQuery.isLoading,
    isFetching: infinitePhotosQuery.isFetching,
    hasNextPage: infinitePhotosQuery.hasNextPage,
    loadMore: () => infinitePhotosQuery.fetchNextPage(),
    refetch: () => infinitePhotosQuery.refetch(),
  };
}
