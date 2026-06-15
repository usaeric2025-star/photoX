import React from 'react';
import { usePhotos, useAdminMode } from '@/hooks';
import { useFilters } from '@/hooks/useFilters';

/**
 * usePhotoGallery
 * 提供全局照片列表的封裝，自動響應 URL 篩選條件。
 */
export function usePhotoGallery() {
  const isManagement = window.location.pathname.startsWith('/admin');
  const isAdminMode = useAdminMode() && isManagement;
  const filters = useFilters({ enableStatus: true });

  const tagsString = Array.isArray(filters.tags) ? filters.tags.join(',') : '';

  const photosFilters = ({
    category_id: filters.category || undefined,
    tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
    searchQuery: filters.search || undefined,
    sortOrder: filters.sort || 'newest',
    isAdminMode: isAdminMode,
    is_hidden: isAdminMode ? undefined : false
  });

  const infinitePhotosQuery = usePhotos(photosFilters);

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
