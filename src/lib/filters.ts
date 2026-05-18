import { Photo, Category, Tag } from '../types';
import { isValidPhoto } from './typeGuard';
import { filterPhotosByMode } from '../utils/photoVisibility';

export const cleanPhotos = (photos: unknown[]): Photo[] => {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((p): p is Record<string, unknown> => {
      if (p == null || typeof p !== 'object') return false;
      if (!isValidPhoto(p)) {
        console.warn('Invalid photo data:', p);
        return false;
      }
      return true;
    })
    .map(p => ({
      ...p,
      id: String(p.id),
      name: String(p.name || ''),
      item_code: String(p.item_code || ''),
      image_hash: String(p.image_hash || ''),
      image_url: String(p.image_url || ''),
      createdAt: String(p.createdAt || new Date().toISOString()),
      tagIds: Array.isArray(p.tagIds) ? p.tagIds.map(String) : [],
      dimensions: Array.isArray(p.dimensions) ? p.dimensions as any[] : [], // Still need to handle Dimension type properly later
      createdAtTimestamp: new Date((p.createdAt as string) || (p.created_at as string) || 0).getTime(),
    }) as unknown as Photo);
};

export interface FilterOptions {
  searchQuery?: string;
  filterCatId?: string | null;
  filterSubId?: string | null;
  filterTagIds?: string[];
  sortOrder?: 'asc' | 'desc';
  isAdminMode?: boolean;
  isStaffMode?: boolean;
}

export function filterPhotos(
  photos: Photo[],
  options: FilterOptions,
  tags: Tag[],
  categories?: Category[],
  preCalculatedTagMap?: Map<string, string[]>,
  preCalculatedCatMap?: Map<string, string[]>
): Photo[] {
  if (!Array.isArray(photos)) return [];
  
  const {
    searchQuery,
    filterCatId,
    filterSubId,
    filterTagIds = [],
    sortOrder = 'desc',
    isAdminMode = false,
    isStaffMode = false,
  } = options;

  // 1. Basic Visibility Filter
  const filteredPhotos = filterPhotosByMode(photos, isAdminMode || isStaffMode);

  let result = filteredPhotos.map(p => ({
    ...p,
    _time: p.createdAtTimestamp || new Date(p.createdAt || (p as any).created_at || 0).getTime()
  }));

  // 2. Search Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    
    // Pre-calculate tag names and category names for each photo to avoid O(N*M) in filter
    const tagMap = preCalculatedTagMap || new Map<string, string[]>();
    if (!preCalculatedTagMap) {
      tags.forEach(t => {
        const terms = [t.name.toLowerCase()];
        if (Array.isArray(t.aliases)) {
          t.aliases.forEach(a => terms.push(a.toLowerCase()));
        }
        tagMap.set(String(t.id), terms);
      });
    }
    
    const catMap = preCalculatedCatMap || new Map<string, string[]>();
    if (!preCalculatedCatMap && categories) {
      categories.forEach(c => {
        const terms = [(c.zh || c.name || '').toLowerCase()];
        if (Array.isArray(c.aliases)) {
          c.aliases.forEach(a => terms.push(a.toLowerCase()));
        }
        catMap.set(String(c.id), terms);
      });
    }

    result = result.filter(p => {
      // Basic text fields (item_code, name, manual_code, etc)
      const hasBasicMatch = 
        (p.name || '').toLowerCase().includes(q) || 
        (p.manual_code || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      
      if (hasBasicMatch) return true;

      // Translation fields
      if (p.description_translations) {
        const trans = p.description_translations;
        if (
          (trans.zh || '').toLowerCase().includes(q) ||
          (trans.en || '').toLowerCase().includes(q) ||
          (trans.ms || '').toLowerCase().includes(q)
        ) return true;
      }

      // Tags match (including aliases)
      const pTagIds = Array.isArray(p.tagIds) ? p.tagIds : [];
      const hasTagMatch = pTagIds.some(tid => {
        const terms = tagMap.get(String(tid));
        return terms && terms.some(term => term.includes(q));
      });
      if (hasTagMatch) return true;

      // Category match (including aliases)
      if (p.categoryId) {
        const terms = catMap.get(String(p.categoryId));
        if (terms && terms.some(term => term.includes(q))) return true;
      }

      return false;
    });
  }

  // 3. Category Filter
  if (filterCatId) {
    result = result.filter(p => String(p.categoryId) === String(filterCatId));
  }

  // 4. SubCategory/Manufacturer Filter
  if (filterSubId) {
    result = result.filter(p => p.manufacturerId === filterSubId);
  }

  // 5. Tag Filter
  if (filterTagIds.length > 0) {
    const tagFallbackMap = new Map<string, string>();
    filterTagIds.forEach(tid => {
      const tagObj = tags.find(t => String(t.id) === String(tid));
      if (tagObj) tagFallbackMap.set(tid, tagObj.name.toLowerCase());
    });
    
    result = result.filter(p => {
      const pTagIds = Array.isArray(p.tagIds) ? p.tagIds.map(String) : (typeof p.tagIds === 'string' ? [String(p.tagIds)] : []);
      
      return filterTagIds.every(tid => {
        const strTid = String(tid);
        if (pTagIds.includes(strTid)) return true;
        
        const fallbackName = tagFallbackMap.get(tid);
        if (fallbackName) {
          return pTagIds.some(pt => String(pt).toLowerCase() === fallbackName);
        }
        return false;
      });
    });
  }

  // 6. Sort
  result.sort((a, b) => {
    // Sort hidden to the absolute end, regardless of pinned status
    if (a.is_hidden && !b.is_hidden) return 1;
    if (!a.is_hidden && b.is_hidden) return -1;

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    return sortOrder === 'desc' ? b._time! - a._time! : a._time! - b._time!;
  });

  return result;
}

export function sortGroupPhotos(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    if (a.isGroupCover && !b.isGroupCover) return -1;
    if (!a.isGroupCover && b.isGroupCover) return 1;
    
    const aOrder = a.groupOrder ?? (a as any).group_order;
    const bOrder = b.groupOrder ?? (b as any).group_order;

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    return (a.item_code || '').localeCompare(b.item_code || '');
  });
}

export function groupPhotos(photos: Photo[], showGroupsCollapsed: boolean, sortOrder: 'asc' | 'desc' = 'desc'): Photo[] {
  const cleanedPhotos = cleanPhotos(photos);
  if (cleanedPhotos.length === 0 && Array.isArray(photos) && photos.length > 0) return [];
  if (!showGroupsCollapsed) return cleanedPhotos;

  const groups = new Map<string, Photo[]>();
  const groupMaxTime = new Map<string, number>();

  cleanedPhotos.forEach(p => {
    if (p.groupId) {
      if (!groups.has(p.groupId)) groups.set(p.groupId, []);
      groups.get(p.groupId)!.push(p);

      const time = p.createdAtTimestamp || new Date(p.createdAt || (p as any).created_at || 0).getTime();
      const maxT = groupMaxTime.get(p.groupId) || 0;
      groupMaxTime.set(p.groupId, Math.max(maxT, time));
    }
  });

  const representatives: Photo[] = [];
  const groupsSeen = new Set<string>();

  cleanedPhotos.forEach(p => {
    if (!p.groupId) {
      representatives.push(p);
    } else if (!groupsSeen.has(p.groupId)) {
      groupsSeen.add(p.groupId);
      const groupList = groups.get(p.groupId) || [];
      const sorted = sortGroupPhotos(groupList);
      const cover = { ...sorted[0] };
      cover._time = groupMaxTime.get(p.groupId)!;
      representatives.push(cover);
    }
  });
  
  representatives.sort((a, b) => {
    // Sort hidden to the absolute end, regardless of pinned status
    if (a.is_hidden && !b.is_hidden) return 1;
    if (!a.is_hidden && b.is_hidden) return -1;

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    return sortOrder === 'desc' ? b._time! - a._time! : a._time! - b._time!;
  });

  return representatives;
}
