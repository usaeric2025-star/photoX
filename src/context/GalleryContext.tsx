import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Photo, Category, Tag } from '../types';
import { filterPhotos, groupPhotos } from '../lib/filters';

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
  isStaffMode: boolean; // Add this
  user: any;
  isAdminMode: boolean;
  page: number;
  hasMore: boolean;
  
  // Settlers
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setFilterCatId: React.Dispatch<React.SetStateAction<string | null>>;
  setFilterSubId: React.Dispatch<React.SetStateAction<string | null>>;
  setFilterTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  setIsMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShowGroupsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInfiniteMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStaffMode: React.Dispatch<React.SetStateAction<boolean>>; // Add this
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setIsAdminMode: React.Dispatch<React.SetStateAction<boolean>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setTotalCloudCount: React.Dispatch<React.SetStateAction<number>>;
  
  // Actions
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  isPhotoSelected: (id: string) => boolean;
  
  // Derived
  displayPhotos: Photo[]; // The list used for Lightbox indexing
  gridPhotos: Photo[];    // The list after grouping and visibleCount slice
  totalGridCount: number;
  totalCloudCount: number; // For total count display
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
        if (!Array.isArray(next)) {
            console.error("setPhotos called with non-array value", next);
            return prev;
        }
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
  const [isStaffMode, setIsStaffMode] = useState(() => {
    return sessionStorage.getItem('isStaffMode') === 'true';
  });
  
  useEffect(() => {
    sessionStorage.setItem('isStaffMode', String(isStaffMode));
  }, [isStaffMode]);

  const [user, setUser] = useState<any>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCloudCount, setTotalCloudCount] = useState(0);

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

    // Use pre-computed time to avoid repeated Date parsing during sort
    const displayPhotos = useMemo(() => {
      return filterPhotos(photos, {
        searchQuery: debouncedSearchQuery,
        filterCatId,
        filterSubId,
        filterTagIds,
        sortOrder,
        isAdminMode,
        isStaffMode
      }, tags);
    }, [photos, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder, isAdminMode, isStaffMode, tags]);

  // final grid: with grouping
  const gridPhotosFull = useMemo(() => {
    return groupPhotos(displayPhotos, showGroupsCollapsed);
  }, [displayPhotos, showGroupsCollapsed]);

  const gridPhotos = useMemo(() => {
    return gridPhotosFull.slice(0, visibleCount);
  }, [gridPhotosFull, visibleCount]);

  const stableTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    photosState.forEach(p => {
      const ids = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
      ids.forEach(id => {
        counts[String(id)] = (counts[String(id)] || 0) + 1;
      });
    });
    return counts;
  }, [photosState]);

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
      isStaffMode,
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
      setIsStaffMode,
      setUser,
      setIsAdminMode,
      setPage,
      setHasMore,
      setTotalCloudCount,
      togglePhotoSelection,
      clearSelection,
      isPhotoSelected,
      displayPhotos,
      gridPhotos,
      totalGridCount: gridPhotosFull.length,
      totalCloudCount
    };
  }, [
    photos, categories, tags, manufacturers, searchQuery, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, 
    sortOrder, selectedIds, isMultiSelect, showGroupsCollapsed, visibleCount, isInfiniteMode, isStaffMode, user, isAdminMode, page, hasMore,
    tagNameToIdMap, tagIdToNameMap, sortedTags,
    togglePhotoSelection, clearSelection, isPhotoSelected, displayPhotos, gridPhotos, gridPhotosFull.length, totalCloudCount
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
