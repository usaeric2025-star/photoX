import { useMemo } from 'react';
import { Photo, Category, Tag } from '../types';
import { useGalleryStore } from '../store';
import { filterPhotos, groupPhotos } from '../lib/filters';
import { isValidPhoto } from '../lib/typeGuard';
import { useAdminMode } from './useAdminMode';

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
  const {
    searchQuery,
    filterCatId,
    filterSubId,
    filterTagIds,
    sortOrder,
    isStaffMode,
    showGroupsCollapsed: storeShowGroupsCollapsed
  } = useGalleryStore();

  const hookIsAdminMode = useAdminMode();
  const effectiveIsAdminMode = options.isAdminModeOverride !== undefined 
    ? options.isAdminModeOverride 
    : hookIsAdminMode;

  const showGroups = options.showGroupsCollapsed !== undefined 
    ? options.showGroupsCollapsed 
    : storeShowGroupsCollapsed;

  const { displayPhotos, gridPhotos } = useMemo(() => {
    const validPhotos = (incomingPhotos || []).filter(isValidPhoto);
    
    const tagMap = new Map<string, string[]>();
    tags.forEach(t => {
      const terms = [t.name.toLowerCase()];
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      tagMap.set(String(t.id), terms);
    });
    
    const catMap = new Map<string, string[]>();
    categories.forEach(c => {
      const terms = [(c.zh || c.name || '').toLowerCase()];
      if (Array.isArray(c.aliases)) {
        c.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      catMap.set(String(c.id), terms);
    });

    const dp = filterPhotos(validPhotos, {
      searchQuery,
      filterCatId,
      filterSubId,
      filterTagIds,
      sortOrder,
      isAdminMode: effectiveIsAdminMode,
      isStaffMode
    }, tags, categories, tagMap, catMap);

    const gp = groupPhotos(dp, showGroups, sortOrder);
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
    showGroups
  ]);

  return { displayPhotos, gridPhotos };
}
