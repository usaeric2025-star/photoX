import { useMemo } from 'react';
import { Photo, Category, Tag } from '@/types';
import { useGalleryStore, useShallow } from '@/store';
import { filterPhotos, groupPhotos } from '@/lib/filters';
import { isValidPhoto } from '@/lib/typeGuard';
import { useAdminMode } from '@/hooks';
import { useFilters } from '@/features/filters/useFilters';

/**
 * Unified hook for filtering and grouping photos.
 * Used by both PublicGallery and AdminView.
 */
export function usePhotoFilters(
  incomingPhotos: Photo[],
  categories: Category[],
  tags: Tag[],
  options: {
    showGroupsCollapsed?: boolean;
    isAdminModeOverride?: boolean;
  } = {}
) {
  const { filters } = useFilters();
  const { 
    filterSubId, sortOrder, 
    isStaffMode 
  } = useGalleryStore(useShallow(s => ({
    filterSubId: s.filterSubId,
    sortOrder: s.sortOrder,
    isStaffMode: s.isStaffMode
  })));

  const hookIsAdminMode = useAdminMode();
  const effectiveIsAdminMode = options.isAdminModeOverride !== undefined 
    ? options.isAdminModeOverride 
    : hookIsAdminMode;

  const showGroups = options.showGroupsCollapsed !== undefined
    ? options.showGroupsCollapsed
    : filters.showGroupsCollapsed;

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
      const terms = [(c.name || '').toLowerCase()];
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
      searchQuery: filters.searchQuery,
      filterCatId: filters.categoryId,
      filterSubId,
      filterTagIds: filters.tagIds,
      sortOrder,
      isAdminMode: effectiveIsAdminMode,
      isStaffMode
    }, tags, categories, searchMaps.tagMap, searchMaps.catMap);

    const gp = groupPhotos(dp, showGroups, sortOrder, validPhotos);
    return { displayPhotos: dp, gridPhotos: gp };
  }, [
    incomingPhotos, 
    filters.searchQuery, 
    filters.categoryId, 
    filterSubId, 
    filters.tagIds, 
    sortOrder, 
    effectiveIsAdminMode, 
    isStaffMode, 
    tags, 
    categories, 
    showGroups,
    searchMaps
  ]);

  return useMemo(() => ({ displayPhotos, gridPhotos }), [displayPhotos, gridPhotos]);
}
