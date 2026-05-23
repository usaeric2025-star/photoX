import { useMemo, useCallback } from 'react';
import { Photo, Category, Tag } from '@/types';
import { useGalleryStore, useShallow } from '@/store';
import { filterPhotos, groupPhotos } from '@/lib/filters';
import { isValidPhoto } from '@/lib/typeGuard';
import { useAdminMode } from '@/hooks';

/**
 * Unified hook for filtering and grouping photos.
 * Replaces usePhotoFilters.
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
  const { 
    searchQuery, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder, 
    isStaffMode, showGroupsCollapsed: storeShowGroupsCollapsed 
  } = useGalleryStore(useShallow(s => ({
    searchQuery: s.searchQuery,
    debouncedSearchQuery: s.debouncedSearchQuery,
    filterCatId: s.filterCatId,
    filterSubId: s.filterSubId,
    filterTagIds: s.filterTagIds,
    sortOrder: s.sortOrder,
    isStaffMode: s.isStaffMode,
    showGroupsCollapsed: s.showGroupsCollapsed
  })));

  const hookIsAdminMode = useAdminMode();
  const effectiveIsAdminMode = options.isAdminModeOverride !== undefined 
    ? options.isAdminModeOverride 
    : hookIsAdminMode;

  const showGroups = options.showGroupsCollapsed !== undefined
    ? options.showGroupsCollapsed
    : storeShowGroupsCollapsed;

  const searchMaps = useMemo(() => {
    const tMap = new Map<string, string[]>();
    tags.forEach(t => {
      const terms = [t.name.toLowerCase()];
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      tMap.set(String(t.id), terms);
    });
    
    const cMap = new Map<string, string[]>();
    categories.forEach(c => {
      const terms = [(c.zh || c.name || '').toLowerCase()];
      if (Array.isArray(c.aliases)) {
        c.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      cMap.set(String(c.id), terms);
    });

    return { tagMap: tMap, catMap: cMap };
  }, [tags, categories]);

  const { displayPhotos, gridPhotos } = useMemo(() => {
    const validPhotos = (incomingPhotos || []).filter(isValidPhoto);
    
    const dp = filterPhotos(validPhotos, {
      searchQuery,
      filterCatId,
      filterSubId,
      filterTagIds,
      sortOrder,
      isAdminMode: effectiveIsAdminMode,
      isStaffMode
    }, tags, categories, searchMaps.tagMap, searchMaps.catMap);

    const gp = groupPhotos(dp, showGroups, sortOrder, validPhotos);
    return { displayPhotos: dp, gridPhotos: gp };
  }, [
    incomingPhotos, 
    searchQuery, 
    filterCatId, 
    filterSubId, 
    filterTagIds, 
    sortOrder, 
    effectiveIsAdminMode, 
    isStaffMode, 
    tags, 
    categories, 
    showGroups,
    searchMaps
  ]);

  const handleRefresh = useCallback(() => {
    // If we need checkSyncLock we can pass it or accept it
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
