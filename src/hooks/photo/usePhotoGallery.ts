import { usePhotos, useUrlFilters, useAdminMode } from '@/hooks';

/**
 * usePhotoGallery
 * 提供全局照片列表的封裝，自動響應 URL 篩選條件。
 * 替換原有的 features/photos/usePhotoGallery.ts。
 */
export function usePhotoGallery() {
  const isManagement = window.location.pathname.startsWith('/admin');
  const isAdminMode = useAdminMode() && isManagement;
  const { filters: urlFilters } = useUrlFilters();

  const infinitePhotosQuery = usePhotos({
    category_id: urlFilters.categoryId,
    tag_id: urlFilters.tagId,
    searchQuery: urlFilters.searchQuery,
    sortOrder: urlFilters.sortOrder,
    isAdminMode: isAdminMode,
    onlyUngrouped: urlFilters.onlyUngrouped,
    manufacturer_id: urlFilters.manufacturerId,
    is_hidden: isAdminMode ? undefined : false
  });

  const photos = infinitePhotosQuery.data?.photos ?? [];

  return {
    photos,
    infinitePhotosQuery,
    isLoading: infinitePhotosQuery.isLoading,
    isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
    hasNextPage: !!infinitePhotosQuery.hasNextPage,
    fetchNextPage: infinitePhotosQuery.fetchNextPage
  };
}
