import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Photo, Category, Tag, DB_Category } from '../types';

interface GalleryContextType {
  // State
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  dbCategories: DB_Category[];
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
  user: any;
  isAdminMode: boolean;
  
  // Settlers
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setDbCategories: React.Dispatch<React.SetStateAction<DB_Category[]>>;
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>;
  setSearchQuery: (query: string) => void;
  setFilterCatId: (id: string | null) => void;
  setFilterSubId: (id: string | null) => void;
  setFilterTagIds: (ids: string[]) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setIsMultiSelect: (is: boolean) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShowGroupsCollapsed: (show: boolean) => void;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  setUser: (user: any) => void;
  setIsAdminMode: (is: boolean) => void;
  
  // Actions
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  isPhotoSelected: (id: string) => boolean;
  
  // Derived
  displayPhotos: Photo[]; // The list used for Lightbox indexing
  gridPhotos: Photo[];    // The list after grouping and visibleCount slice
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dbCategories, setDbCategories] = useState<DB_Category[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const [user, setUser] = useState<any>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(15);
  }, [debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, sortOrder, showGroupsCollapsed]);

  const togglePhotoSelection = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isPhotoSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Intermediate: Raw Filtered and Sorted
  const displayPhotos = useMemo(() => {
    let result = [...photos];
    
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        (p.manual_code || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.sub_category || '').toLowerCase().includes(q) ||
        (p.model_number || '').toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    
    if (filterCatId) {
      const activeCat = dbCategories.find(c => c.code === filterCatId);
      result = result.filter(p => p.categoryId === filterCatId || p.category === filterCatId || (activeCat && p.category === activeCat.zh));
    }
    
    if (filterSubId) {
      const activeMfr = manufacturers.find(m => m.id === filterSubId);
      result = result.filter(p => p.subcategoryId === filterSubId || p.sub_category === filterSubId || (activeMfr && p.sub_category === activeMfr.name));
    }
    
    if (filterTagIds.length > 0) {
      result = result.filter(p => {
        const pTags = Array.isArray(p.tags) ? p.tags : [];
        const pTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
        return filterTagIds.every(tid => {
           const tDef = tags.find(t => t.id === tid);
           return pTagIds.includes(tid) || (tDef && pTags.includes(tDef.name));
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

  // final grid: with grouping and pagination
  const gridPhotos = useMemo(() => {
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
    
    return result.slice(0, visibleCount);
  }, [displayPhotos, showGroupsCollapsed, visibleCount]);

  const value = useMemo(() => ({
    photos,
    categories,
    tags,
    dbCategories,
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
    user,
    isAdminMode,
    setPhotos,
    setCategories,
    setTags,
    setDbCategories,
    setManufacturers,
    setSearchQuery,
    setFilterCatId,
    setFilterSubId,
    setFilterTagIds,
    setSortOrder,
    setIsMultiSelect,
    setSelectedIds,
    setShowGroupsCollapsed,
    setVisibleCount,
    setUser,
    setIsAdminMode,
    togglePhotoSelection,
    clearSelection,
    isPhotoSelected,
    displayPhotos,
    gridPhotos
  }), [
    photos, categories, tags, dbCategories, manufacturers, searchQuery, debouncedSearchQuery, filterCatId, filterSubId, filterTagIds, 
    sortOrder, selectedIds, isMultiSelect, showGroupsCollapsed, visibleCount, user, isAdminMode,
    togglePhotoSelection, clearSelection, isPhotoSelected, displayPhotos, gridPhotos
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
