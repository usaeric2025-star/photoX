import { Photo, Category, Tag } from '../types';

export interface FilterOptions {
  searchQuery?: string;
  filterCatId?: string | null;
  filterSubId?: string | null;
  filterTagIds?: string[];
  sortOrder?: 'asc' | 'desc';
  isAdminMode?: boolean;
}

export function filterPhotos(
  photos: Photo[],
  options: FilterOptions,
  tags: Tag[]
): Photo[] {
  const {
    searchQuery,
    filterCatId,
    filterSubId,
    filterTagIds = [],
    sortOrder = 'desc',
    isAdminMode = false,
  } = options;

  let result = photos.map(p => ({
    ...p,
    _time: new Date(p.createdAt || (p as any).created_at || 0).getTime()
  }));

  // 1. Basic Visibility Filter
  if (!isAdminMode) {
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
    return sortOrder === 'desc' ? b._time - a._time : a._time - b._time;
  });

  return result;
}

export function groupPhotos(photos: Photo[], showGroupsCollapsed: boolean): Photo[] {
  if (!showGroupsCollapsed) return photos;

  const groupCovers = new Map<string, Photo>();
  photos.forEach(p => {
    if (p.groupId) {
      const existing = groupCovers.get(p.groupId);
      if (!existing || (p.isGroupCover && !existing.isGroupCover)) {
        groupCovers.set(p.groupId, p);
      }
    }
  });

  const groupsSeen = new Set<string>();
  return photos.filter(p => {
    if (!p.groupId) return true;
    if (groupsSeen.has(p.groupId)) return false;
    groupsSeen.add(p.groupId);
    return true;
  }).map(p => {
    if (p.groupId && groupCovers.has(p.groupId)) {
      return groupCovers.get(p.groupId)!;
    }
    return p;
  });
}
