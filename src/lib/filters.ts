import { Photo, Category, Tag } from '../types';
import { isValidPhoto } from './typeGuard';
import { filterPhotosByMode } from '../utils/photoVisibility';

export const cleanPhotos = (photos: unknown[]): Photo[] => {
  if (!Array.isArray(photos)) return [];
  
  const mapped = photos
    .filter((p): p is Record<string, unknown> => {
      if (p == null || typeof p !== 'object') return false;
      if (!isValidPhoto(p)) {
        return false;
      }
      return true;
    })
    .map(p => {
      const created_at = String(p.created_at || (p as any).created_at || new Date().toISOString());
      return {
        ...p,
        id: String(p.id),
        name: String(p.name || ''),
        item_code: String(p.item_code || ''),
        image_hash: String(p.image_hash || ''),
        image_url: String(p.image_url || ''),
        created_at,
        tag_ids: Array.isArray(p.tag_ids) ? p.tag_ids.map(String) : [],
        dimensions: Array.isArray(p.dimensions) ? p.dimensions as any[] : [],
        created_at_timestamp: new Date(created_at).getTime(),
        is_pinned: !!(p as any).is_pinned || !!p.is_pinned
      } as Photo;
    });

  // Deduplicate by ID first
  const idMap = new Map<string, Photo>();
  mapped.forEach(p => {
    const existing = idMap.get(p.id);
    if (!existing || (p.is_pinned && !existing.is_pinned) || (p.created_at_timestamp! > existing.created_at_timestamp!)) {
      idMap.set(p.id, p);
    }
  });

  // Then by ID (deduplicate by DB ID only)
  const idResults = Array.from(idMap.values());
  return idResults;
};

export interface FilterOptions {
  searchQuery?: string;
  filterCatId?: string | null;
  filterSubId?: string | null;
  filterTagIds?: string[];
  sortOrder?: 'newest' | 'oldest' | 'name';
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
    sortOrder = 'newest',
    isAdminMode = false,
    isStaffMode = false,
  } = options;

  // 1. Basic Visibility Filter
  const filteredPhotos = filterPhotosByMode(photos, isAdminMode || isStaffMode);

  let result = filteredPhotos.map(p => ({
    ...p,
    _time: p.created_at_timestamp || new Date(p.created_at || (p as any).created_at || 0).getTime()
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
      const pTagIds = Array.isArray(p.tag_ids) ? p.tag_ids : [];
      const hasTagMatch = pTagIds.some(tid => {
        const terms = tagMap.get(String(tid));
        return terms && terms.some(term => term.includes(q));
      });
      if (hasTagMatch) return true;

      // Category match (including aliases)
      if (p.category_id) {
        const terms = catMap.get(String(p.category_id));
        if (terms && terms.some(term => term.includes(q))) return true;
      }

      return false;
    });
  }

  // 3. Category / SubId / Tag Filter (AND relation as independent filters)
  if (filterCatId || filterSubId || filterTagIds.length > 0) {
    const tagFallbackMap = new Map<string, string>();
    if (filterTagIds.length > 0) {
      filterTagIds.forEach(tid => {
        const tagObj = tags.find(t => String(t.id) === String(tid));
        if (tagObj) tagFallbackMap.set(tid, tagObj.name.toLowerCase());
      });
    }

    result = result.filter(p => {
      // 3.1 Category Match
      if (filterCatId && String(p.category_id) !== String(filterCatId)) return false;
      
      // 3.2 SubCategory/Manufacturer Match
      if (filterSubId && p.manufacturer_id !== filterSubId) return false;

      // 3.3 Tag Match
      if (filterTagIds.length > 0) {
        const pTagIds = Array.isArray(p.tag_ids) ? p.tag_ids.map(String) : (typeof p.tag_ids === 'string' ? [String(p.tag_ids)] : []);
        const matchesAllTagsSelected = filterTagIds.every(tid => {
          const strTid = String(tid);
          if (pTagIds.includes(strTid)) return true;
          
          const fallbackName = tagFallbackMap.get(tid);
          if (fallbackName) {
            return pTagIds.some(pt => String(pt).toLowerCase() === fallbackName);
          }
          return false;
        });
        if (!matchesAllTagsSelected) return false;
      }

      return true;
    });
  }

  // 6. Sort
  result.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    if (sortOrder === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    
    return sortOrder === 'oldest' ? a._time! - b._time! : b._time! - a._time!;
  });

  return result;
}

export function sortGroupPhotos(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    if (a.is_group_cover && !b.is_group_cover) return -1;
    if (!a.is_group_cover && b.is_group_cover) return 1;
    
    const aOrder = a.group_order ?? (a as any).group_order;
    const bOrder = b.group_order ?? (b as any).group_order;

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    return (a.item_code || '').localeCompare(b.item_code || '');
  });
}

export function groupPhotos(photos: Photo[], showGroupsCollapsed: boolean, sortOrder: 'newest' | 'oldest' | 'name' = 'newest', globalPhotos?: Photo[]): Photo[] {
  if (photos.length === 0) return [];

  const groups = new Map<string, Photo[]>();
  const groupMaxTime = new Map<string, number>();

  photos.forEach(p => {
    if (p.group_id) {
      if (!groups.has(p.group_id)) groups.set(p.group_id, []);
      groups.get(p.group_id)!.push(p);

      const time = p.created_at_timestamp || new Date(p.created_at || (p as any).created_at || 0).getTime();
      const maxT = groupMaxTime.get(p.group_id) || 0;
      groupMaxTime.set(p.group_id, Math.max(maxT, time));
    }
  });

  // Calculate global group counts if globalPhotos is provided
  const globalGroupCounts = new Map<string, number>();
  if (globalPhotos && globalPhotos.length > 0) {
    globalPhotos.forEach(p => {
      if (p.group_id) {
        globalGroupCounts.set(p.group_id, (globalGroupCounts.get(p.group_id) || 0) + 1);
      }
    });
  }

  const representatives: Photo[] = [];
  const groupsSeen = new Set<string>();

  photos.forEach(p => {
    if (!p.group_id) {
      // For ungroupped items, just give them their own time
      const time = p.created_at_timestamp || new Date(p.created_at || (p as any).created_at || 0).getTime();
      const item = { ...p, _time: time };
      representatives.push(item);
    } else if (!groupsSeen.has(p.group_id)) {
      groupsSeen.add(p.group_id);
      const groupList = groups.get(p.group_id) || [];
      const sorted = sortGroupPhotos(groupList);
      
      if (showGroupsCollapsed) {
        const trueMemberCount = globalGroupCounts.has(p.group_id) 
          ? globalGroupCounts.get(p.group_id)! 
          : groupList.length;
          
        const cover = { ...sorted[0], member_count: trueMemberCount };
        cover._time = groupMaxTime.get(p.group_id)!;
        representatives.push(cover);
      } else {
        // Flat expansion but bind them under the same time logic so they stay together
        sorted.forEach(member => {
           const time = groupMaxTime.get(member.group_id as string)!;
           // Subtracting a tiny amount per index could keep them ordered internally, but their index does it
           const idx = sorted.indexOf(member);
           const m = { ...member, _time: time - idx }; // slight offset to keep internal order
           representatives.push(m);
        });
      }
    }
  });
  
  representatives.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    if (sortOrder === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }

    return sortOrder === 'oldest' ? a._time! - b._time! : b._time! - a._time!;
  });
  
  return representatives;
}
