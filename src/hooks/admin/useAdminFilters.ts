import { useCallback } from 'react';
import { Photo, Category, Tag } from '@/types';
import { useGalleryStore, useShallow } from '@/store';
import { usePhotoFilters } from '@/hooks';

/**
 * Enhanced hook for admin filtering and grouping photos.
 * Reuses the core usePhotoFilters under the hood to ensure consistent logic.
 */
export function useAdminFilters(
  incomingPhotos: Photo[],
  categories: Category[],
  tags: Tag[],
  options: {
    showGroupsCollapsed?: boolean;
    isAdminModeOverride?: boolean;
  } = {}
) {
  const { displayPhotos, gridPhotos } = usePhotoFilters(incomingPhotos, categories, tags, options);

  const { 
    searchQuery, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder 
  } = useGalleryStore(useShallow(s => ({
    searchQuery: s.searchQuery,
    debouncedSearchQuery: s.debouncedSearchQuery,
    filterCatId: s.filterCatId,
    filterSubId: s.filterSubId,
    filterTagIds: s.filterTagIds,
    sortOrder: s.sortOrder
  })));

  const handleRefresh = useCallback(() => {
    useGalleryStore.getState().setSearchQuery('');
    useGalleryStore.getState().setDebouncedSearchQuery('');
    useGalleryStore.getState().setFilterCatId(null);
    useGalleryStore.getState().setFilterTagIds([]);
    
    sessionStorage.removeItem('photo-filters');
    localStorage.removeItem('photo-filters');
  }, []);

  return { 
    displayPhotos, 
    gridPhotos, 
    handleRefresh,
    searchQuery,
    debouncedSearchQuery,
    filterCatId,
    filterSubId,
    filterTagIds,
    sortOrder
  };
}
