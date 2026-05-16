import { Photo, Category, Tag } from '../types';

export const cleanPhotos = (photos: unknown[]): Photo[] => {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((p): p is Record<string, unknown> => p != null && typeof p === 'object')
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
  tags: Tag[]
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

  let result = photos.map(p => ({
    ...p,
    _time: p.createdAtTimestamp || new Date(p.createdAt || (p as any).created_at || 0).getTime()
  }));

  // 1. Basic Visibility Filter
  if (!isAdminMode && !isStaffMode) {
    result = result.filter(p => !p.isHidden || p.isGroupCover);
  }

  // 2. Search Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.manual_code || '').toLowerCase().includes(q) ||
      (p.model_number || '').toLowerCase().includes(q)
    );
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
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return sortOrder === 'desc' ? b._time! - a._time! : a._time! - b._time!;
  });

  return result;
}

export function groupPhotos(photos: Photo[], showGroupsCollapsed: boolean, sortOrder: 'asc' | 'desc' = 'desc'): Photo[] {
  const cleanedPhotos = cleanPhotos(photos);
  if (cleanedPhotos.length === 0 && Array.isArray(photos) && photos.length > 0) return [];
  if (!showGroupsCollapsed) return cleanedPhotos;

  const groupCovers = new Map<string, Photo>();
  const groupMaxTime = new Map<string, number>();

  cleanedPhotos.forEach(p => {
    if (p.groupId) {
      const time = p.createdAtTimestamp || new Date(p.createdAt || (p as any).created_at || 0).getTime();
      
      const maxT = groupMaxTime.get(p.groupId) || 0;
      groupMaxTime.set(p.groupId, Math.max(maxT, time));
      
      const existing = groupCovers.get(p.groupId);
      if (!existing || (p.isGroupCover && !existing.isGroupCover)) {
        groupCovers.set(p.groupId, p);
      }
    }
  });

  const representatives: Photo[] = [];
  const groupsSeen = new Set<string>();

  cleanedPhotos.forEach(p => {
    if (!p.groupId) {
      representatives.push(p);
    } else if (!groupsSeen.has(p.groupId)) {
      groupsSeen.add(p.groupId);
      const coverData = groupCovers.get(p.groupId);
      const cover = coverData ? { ...coverData } : { ...p, groupId: p.groupId };
      cover._time = groupMaxTime.get(p.groupId)!;
      representatives.push(cover);
    }
  });
  
  representatives.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return sortOrder === 'desc' ? b._time! - a._time! : a._time! - b._time!;
  });

  return representatives;
}
