import { Photo, Category, Tag, isValidPhoto } from '@/types';

export interface FilterOptions {
  searchQuery?: string;
  filterCatId?: string | null;
  filterSubId?: string | null;
  filterTagIds?: string[];
  sortOrder?: 'newest' | 'oldest' | 'name';
  isAdminMode?: boolean;
}

/**
 * Filter photos by visibility mode (admin vs public)
 */
export function filterPhotosByMode(photos: Photo[], isAdmin: boolean): Photo[] {
  if (isAdmin) return photos;
  return photos.filter(p => !p.is_hidden);
}

/**
 * Smart natural sort comparison
 */
export function smartCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts photos within a group
 */
export function sortGroupPhotos(members: Photo[]): Photo[] {
  return [...members].sort((a, b) => {
    // 1. Cover first
    if (a.is_group_cover && !b.is_group_cover) return -1;
    if (!a.is_group_cover && b.is_group_cover) return 1;

    // 2. Order by group_order
    const aOrder = a.group_order;
    const bOrder = b.group_order;
    if (aOrder !== undefined && bOrder !== undefined) {
      if (aOrder !== bOrder) return aOrder - bOrder;
    } else if (aOrder !== undefined) return -1;
    else if (bOrder !== undefined) return 1;

    // 3. Last fallback: by code
    return (a.item_code || '').localeCompare(b.item_code || '');
  });
}

/**
 * Core filtering logic (Search + Categories + Tags)
 */
export function filterPhotos(
  photos: Photo[],
  options: FilterOptions,
  tags: Tag[],
  categories?: Category[],
  tagMap?: Map<string, string[]>,
  catMap?: Map<string, string[]>
): Photo[] {
  if (!Array.isArray(photos)) return [];
  
  const {
    searchQuery,
    filterCatId,
    filterSubId,
    filterTagIds = [],
    isAdminMode = false,
  } = options;

  // 1. Basic Visibility Filter
  let result = filterPhotosByMode(photos, isAdminMode);

  // 2. Search Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    
    // Internal maps if not provided
    const _tagMap = tagMap || new Map<string, string[]>();
    if (!tagMap) {
      tags.forEach(t => {
        const terms = [t.name.toLowerCase()];
        if (Array.isArray(t.aliases)) {
          t.aliases.forEach(a => terms.push(a.toLowerCase()));
        }
        _tagMap.set(String(t.id), terms);
      });
    }
    
    const _catMap = catMap || new Map<string, string[]>();
    if (!catMap && categories) {
      categories.forEach(c => {
        const terms = [(c.name || '').toLowerCase()];
        if (Array.isArray(c.aliases)) {
          c.aliases.forEach(a => terms.push(a.toLowerCase()));
        }
        _catMap.set(String(c.id), terms);
      });
    }

    result = result.filter(p => {
      const nameObj = (p.name || {}) as any;
      const descObj = (p.description || {}) as any;
      
      const searchableName = typeof nameObj === 'string' 
        ? (nameObj as string).toLowerCase() 
        : `${nameObj.zh || ''} ${nameObj.en || ''} ${nameObj.ms || ''}`.toLowerCase();
        
      const searchableDesc = typeof descObj === 'string'
        ? (descObj as string).toLowerCase()
        : `${descObj.zh || ''} ${descObj.en || ''} ${descObj.ms || ''}`.toLowerCase();

      const hasBasicMatch = 
        searchableName.includes(q) ||
        (p.manual_code || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        searchableDesc.includes(q);
      
      if (hasBasicMatch) return true;

      const pTags = p.tags || [];
      const hasTagMatch = pTags.some(t => {
        const terms = _tagMap.get(String(t.id));
        return terms && terms.some(term => term.includes(q));
      });
      if (hasTagMatch) return true;

      if (p.category_id) {
        const terms = _catMap.get(String(p.category_id));
        if (terms && terms.some(term => term.includes(q))) return true;
      }

      return false;
    });
  }

  // 3. Category / Manufacturer / Tag Filter
  if (filterCatId || filterSubId || filterTagIds.length > 0) {
    result = result.filter(p => {
      if (filterCatId && String(p.category_id) !== String(filterCatId)) return false;
      if (filterSubId && p.manufacturer_id !== filterSubId) return false;
      if (filterTagIds.length > 0) {
        const pTags = p.tags || [];
        const matchesAll = filterTagIds.every(tid => 
          pTags.some(t => String(t.id) === String(tid))
        );
        if (!matchesAll) return false;
      }
      return true;
    });
  }

  return result;
}

/**
 * Grouping and flattening logic
 */
export function groupPhotos(
  photos: Photo[], 
  showGroupsCollapsed: boolean, 
  sortOrder: 'newest' | 'oldest' | 'name' = 'newest', 
  globalPhotos?: Photo[], 
  isAdminMode: boolean = false
): Photo[] {
  if (photos.length === 0) return [];

  const groups = new Map<string, Photo[]>();
  const groupMaxTime = new Map<string, number>();

  photos.forEach(p => {
    if (p.group_id) {
      if (!groups.has(p.group_id)) groups.set(p.group_id, []);
      groups.get(p.group_id)?.push(p);

      const time = (p as any)._time || (p.created_at ? new Date(p.created_at).getTime() : 0);
      const maxT = groupMaxTime.get(p.group_id) || 0;
      groupMaxTime.set(p.group_id, Math.max(maxT, time));
    }
  });

  const reps: Photo[] = [];
  const groupsSeen = new Set<string>();

  photos.forEach(p => {
    if (!p.group_id) {
      reps.push(p);
    } else if (!groupsSeen.has(p.group_id)) {
      groupsSeen.add(p.group_id);
      const groupList = groups.get(p.group_id) || [];
      const sorted = sortGroupPhotos(groupList);
      
      const coverName = String(sorted[0].name || '');
      const maxTime = groupMaxTime.get(p.group_id) ?? 0;

      if (showGroupsCollapsed) {
        const cover = {
          ...sorted[0],
          _time: maxTime,
          _groupCoverName: coverName
        };
        reps.push(cover as any);
      } else {
        sorted.forEach(member => {
          reps.push({
            ...member,
            _time: maxTime,
            _groupCoverName: coverName
          } as any);
        });
      }
    }
  });

  // Final Sorting
  reps.sort((a: any, b: any) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.is_hidden && !b.is_hidden) return 1;
    if (!a.is_hidden && b.is_hidden) return -1;

    if (a.group_id && b.group_id && a.group_id === b.group_id) {
       if (a.is_group_cover && !b.is_group_cover) return -1;
       if (!a.is_group_cover && b.is_group_cover) return 1;
       const aOrder = a.group_order ?? 0;
       const bOrder = b.group_order ?? 0;
       if (aOrder !== bOrder) return aOrder - bOrder;
       return (a.item_code || '').localeCompare(b.item_code || '');
    }

    let cmp = 0;
    if (sortOrder === 'name') {
      const nameA = a._groupCoverName ?? String(a.name || '');
      const nameB = b._groupCoverName ?? String(b.name || '');
      cmp = smartCompare(nameA, nameB);
    } else {
      const tA = a._time ?? (a.created_at ? new Date(a.created_at).getTime() : 0);
      const tB = b._time ?? (b.created_at ? new Date(b.created_at).getTime() : 0);
      cmp = sortOrder === 'oldest' ? tA - tB : tB - tA;
    }

    if (cmp !== 0) return cmp;
    const gA = a.group_id || a.id;
    const gB = b.group_id || b.id;
    return gA.localeCompare(gB);
  });
  
  return reps;
}

/**
 * Main coordinator (processPhotos)
 */
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
    tagMap?: Map<string, string[]>;
    catMap?: Map<string, string[]>;
  } = {}
) {
  const showGroups = options.showGroupsCollapsed ?? userFilters.showGroupsCollapsed;
  const isAdminMode = options.isAdminModeOverride ?? false;
  const bypassFilter = options.bypassFilter ?? false;

  let displayPhotos = (photos || []).filter(isValidPhoto);
  
  // Inject timestamps for sorting
  displayPhotos = displayPhotos.map(p => {
    if ((p as any)._time) return p;
    return {
      ...p,
      _time: p.created_at ? new Date(p.created_at).getTime() : 0
    };
  });

  if (!bypassFilter && (userFilters.searchQuery || userFilters.categoryId || userFilters.tagId)) {
    displayPhotos = filterPhotos(displayPhotos, {
      searchQuery: userFilters.searchQuery,
      filterCatId: userFilters.categoryId,
      filterTagIds: userFilters.tagId ? [userFilters.tagId] : [],
      isAdminMode: isAdminMode,
    }, tags, categories, options.tagMap, options.catMap);
  }

  const gridPhotos = groupPhotos(displayPhotos, showGroups, urlFilters.sortOrder as any, undefined, isAdminMode);

  return { displayPhotos, gridPhotos };
}

/**
 * Deduplicate by ID
 */
export const cleanPhotos = (photos: Photo[]): Photo[] => {
  if (!Array.isArray(photos)) return [];
  const idMap = new Map<string, Photo>();
  photos.filter(isValidPhoto).forEach(p => {
    idMap.set(p.id, p);
  });
  return Array.from(idMap.values());
};
