import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Photo, Category, Tag } from '../types';

interface GalleryContextType {
  // State
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  sortedTags: Tag[];
  tagNameToIdMap: Map<string, string>;
  tagIdToNameMap: Map<string, string>;
  manufacturers: any[];
  searchQuery: string;
  debouncedSearchQuery: string;
  filterCatId: string | null;
  filterSubId: string | null;
  filterTagIds: string[];
  sortOrder: 'asc' | 'desc';
  selectedIds: string[];
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  isInfiniteMode: boolean;
  user: any;
  isAdminMode: boolean;
  page: number;
  hasMore: boolean;
  
  // Settlers
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>;
  setSearchQuery: (query: string) => void;
  setFilterCatId: (id: string | null) => void;
  setFilterSubId: (id: string | null) => void;
  setFilterTagIds: (ids: string[]) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setIsMultiSelect: (is: boolean) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShowGroupsCollapsed: (show: boolean) => void;
  setIsInfiniteMode: (is: boolean) => void;
  setUser: (user: any) => void;
  setIsAdminMode: (is: boolean) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setHasMore: (has: boolean) => void;
  
  // Actions
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  isPhotoSelected: (id: string) => boolean;
  
  // Derived
  displayPhotos: Photo[]; // The list used for Lightbox indexing
  gridPhotos: Photo[];    // The list after grouping and visibleCount slice
  totalGridCount: number;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [photosState, setPhotosState] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  
  const setPhotos = useCallback((update: any) => {
    setPhotosState(prev => {
        const next = typeof update === 'function' ? update(prev) : update;
        return next;
    });
  }, []);

  const photos = photosState;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
  }, [debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder]);

  const togglePhotoSelection = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isPhotoSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  const tagNameToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach(tag => map.set(tag.name, tag.id));
    return map;
  }, [tags]);

  const tagIdToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach(tag => map.set(tag.id, tag.name));
    return map;
  }, [tags]);

  // Intermediate: Raw Filtered and Sorted
  const displayPhotos = useMemo(() => {    let result = [...photos];
    
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        (p.manual_code || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q)
      );
    }
    
    if (filterCatId) {
      result = result.filter(p => String(p.categoryId) === String(filterCatId));
    }
    
    if (filterSubId) {
      result = result.filter(p => p.manufacturerId === filterSubId);
    }
    
    if (filterTagIds.length > 0) {
      // Pre-compute tag mapping for fallback logic to avoid repeated tag finds
      const tagFallbackMap = new Map<string, string>();
      filterTagIds.forEach(tid => {
        const tagObj = tags.find(t => String(t.id) === String(tid));
        if (tagObj) tagFallbackMap.set(tid, tagObj.name.toLowerCase());
      });
      
      result = result.filter(p => {
        const pTagIds = Array.isArray(p.tagIds) ? p.tagIds.map(String) : (typeof p.tagIds === 'string' ? [String(p.tagIds)] : []);
        
        // Every selected tag must match either by ID or by name
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

    result.sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [photos, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder]);

  // final grid: with grouping
  const gridPhotosFull = useMemo(() => {
    let result = [...displayPhotos];
    
    if (showGroupsCollapsed) {
      const groupsSeen = new Set<string>();
      result = result.filter(p => {
        if (!p.groupId) return true;
        if (groupsSeen.has(p.groupId)) return false;
        groupsSeen.add(p.groupId);
        return true;
      });
    }
    return result;
  }, [displayPhotos, showGroupsCollapsed]);

  const gridPhotos = useMemo(() => {
    return gridPhotosFull.slice(0, visibleCount);
  }, [gridPhotosFull, visibleCount]);

  const [stableTagCounts, setStableTagCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (filterTagIds.length === 0 && !debouncedSearchQuery && !filterCatId && !filterSubId) {
      const counts: Record<string, number> = {};
      photosState.forEach(p => {
        const ids = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
        ids.forEach(id => {
          counts[String(id)] = (counts[String(id)] || 0) + 1;
        });
      });
      if (Object.keys(counts).length > 0) {
         setStableTagCounts(counts);
      }
    }
  }, [photosState, filterTagIds, debouncedSearchQuery, filterCatId, filterSubId]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const bCount = stableTagCounts[String(b.id)] || 0;
      const aCount = stableTagCounts[String(a.id)] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [tags, stableTagCounts]);

  const value = useMemo(() => {
    return {
      photos,
      categories,
      tags,
      sortedTags,
      tagNameToIdMap,
      tagIdToNameMap,
      manufacturers,
      searchQuery,
      debouncedSearchQuery,
      filterCatId,
      filterSubId,
      filterTagIds,
      sortOrder,
      selectedIds,
      isMultiSelect,
      showGroupsCollapsed,
      visibleCount,
      setVisibleCount,
      isInfiniteMode,
      user,
      isAdminMode,
      page,
      hasMore,
      setPhotos,
      setCategories,
      setTags,
      setManufacturers,
      setSearchQuery,
      setFilterCatId,
      setFilterSubId,
      setFilterTagIds,
      setSortOrder,
      setIsMultiSelect,
      setSelectedIds,
      setShowGroupsCollapsed,
      setIsInfiniteMode,
      setUser,
      setIsAdminMode,
      setPage,
      setHasMore,
      togglePhotoSelection,
      clearSelection,
      isPhotoSelected,
      displayPhotos,
      gridPhotos,
      totalGridCount: gridPhotosFull.length
    };
  }, [
    photos, categories, tags, manufacturers, searchQuery, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, 
    sortOrder, selectedIds, isMultiSelect, showGroupsCollapsed, visibleCount, isInfiniteMode, user, isAdminMode, page, hasMore,
    tagNameToIdMap, tagIdToNameMap, sortedTags,
    togglePhotoSelection, clearSelection, isPhotoSelected, displayPhotos, gridPhotos, gridPhotosFull.length
  ]);

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGalleryContext = () => {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGalleryContext must be used within a GalleryProvider');
  }
  return context;
};
