import { Photo, Category, Tag } from '@/types';
import { useUIStore, useShallow } from '@/store/useUIStore';
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
    filterSubId, sortOrder
  } = useUIStore(useShallow(s => ({
    filterSubId: s.filterSubId,
    sortOrder: s.sortOrder
  })));
  
  const hookIsAdminMode = useAdminMode();
  const effectiveIsAdminMode = options.isAdminModeOverride !== undefined 
    ? options.isAdminModeOverride 
    : hookIsAdminMode;

  const showGroups = options.showGroupsCollapsed !== undefined
    ? options.showGroupsCollapsed
    : filters.showGroupsCollapsed;

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
    const terms = [(c.name || '').toLowerCase()];
    if (Array.isArray(c.aliases)) {
      c.aliases.forEach(a => terms.push(a.toLowerCase()));
    }
    catMap.set(String(c.id), terms);
  });

  const validPhotos = (incomingPhotos || []).filter(isValidPhoto);
    
  const displayPhotos = filterPhotos(validPhotos, {
    searchQuery: filters.searchQuery,
    filterCatId: filters.categoryId,
    filterSubId,
    filterTagIds: filters.tagIds,
    sortOrder,
    isAdminMode: effectiveIsAdminMode,
  }, tags, categories, tagMap, catMap);

  const gridPhotos = groupPhotos(displayPhotos, showGroups, sortOrder);

  return { displayPhotos, gridPhotos };
}
