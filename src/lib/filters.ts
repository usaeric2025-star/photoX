import { Photo, Category, Tag } from '../types';
import { logger } from './logger';
import { isValidPhoto } from './typeGuard';
import { filterPhotos } from './filters/photoFilter';
import { groupPhotos } from './filters/photoGrouping';

export type { FilterOptions } from './filters/photoFilter';
export { sortGroupPhotos, smartCompare } from './filters/photoSorting';
export { groupPhotos } from './filters/photoGrouping';
export { filterPhotos } from './filters/photoFilter';

export function processPhotos(
  photos: Photo[],
  categories: Category[],
  tags: Tag[],
  userFilters: any,
  urlFilters: any,
  options: {
    showGroupsCollapsed?: boolean;
    isAdminModeOverride?: boolean;
    bypassFilter?: boolean;
  } = {}
) {
  const showGroups = options.showGroupsCollapsed ?? userFilters.showGroupsCollapsed;
  const isAdminMode = options.isAdminModeOverride ?? false;
  const bypassFilter = options.bypassFilter ?? false; // Default to false to ensure filtering works

  let displayPhotos = (photos || []).filter(isValidPhoto);
    
  if (!bypassFilter && (userFilters.searchQuery || userFilters.categoryId || userFilters.tagId)) {
    // Create maps only if needed for refinement
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

    displayPhotos = filterPhotos(displayPhotos, {
      searchQuery: userFilters.searchQuery,
      filterCatId: null, // Backend handles
      filterSubId: null,
      filterTagIds: [], // Backend handles
      sortOrder: urlFilters.sortOrder as 'newest' | 'oldest' | 'name',
      isAdminMode: isAdminMode,
    }, tags, categories, tagMap, catMap);
  }

  const gridPhotos = groupPhotos(displayPhotos, showGroups, urlFilters.sortOrder as 'newest' | 'oldest' | 'name', undefined, isAdminMode);

  return { displayPhotos, gridPhotos };
}

// Global utility exports for deduplication and basic mapping are now deprecated in favor of mapSupabasePhoto in services
/** @deprecated Use mapSupabasePhoto in src/services/photo/mapping.ts instead */
export const cleanPhotos = (photos: Photo[]): Photo[] => {
  if (!Array.isArray(photos)) return [];
  // Deduplicate by ID only
  const idMap = new Map<string, Photo>();
  photos.filter(isValidPhoto).forEach(p => {
    idMap.set(p.id, p);
  });
  return Array.from(idMap.values());
};
