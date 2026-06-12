import { Photo, Category, Tag } from '../../types';
import { filterPhotosByMode } from './photoVisibility';

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
    isAdminMode = false,
    isStaffMode = false,
  } = options;

  // 1. Basic Visibility Filter
  let result = filterPhotosByMode(photos, isAdminMode || isStaffMode);

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
      const nameZh = typeof p.name === 'object' ? String(p.name.zh || '') : String(p.name || '');
      const nameEn = typeof p.name === 'object' ? String(p.name.en || '') : '';
      const nameMs = typeof p.name === 'object' ? String(p.name.ms || '') : '';
      
      const descObj = (p.description as any) || {};
      const descZh = typeof p.description === 'object' ? String(descObj.zh || '') : String(p.description || '');
      const descEn = typeof p.description === 'object' ? String(descObj.en || '') : '';
      const descMs = typeof p.description === 'object' ? String(descObj.ms || '') : '';

      const hasBasicMatch = 
        nameZh.toLowerCase().includes(q) || 
        nameEn.toLowerCase().includes(q) ||
        nameMs.toLowerCase().includes(q) ||
        (p.manual_code || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        descZh.toLowerCase().includes(q) ||
        descEn.toLowerCase().includes(q) ||
        descMs.toLowerCase().includes(q);
      
      if (hasBasicMatch) return true;

      // Tags match (including aliases)
      const pTags = Array.isArray(p.tags) ? p.tags : [];
      const hasTagMatch = pTags.some(t => {
        const terms = tagMap.get(String(t.id));
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
        const pTags = Array.isArray(p.tags) ? p.tags : [];
        const matchesAllTagsSelected = filterTagIds.every(tid => {
          const strTid = String(tid);
          if (pTags.some(t => String(t.id) === strTid)) return true;
          
          const fallbackName = tagFallbackMap.get(tid);
          if (fallbackName) {
            return pTags.some(t => String(t.name).toLowerCase() === fallbackName);
          }
          return false;
        });
        if (!matchesAllTagsSelected) return false;
      }

      return true;
    });
  }

  return result;
}
