import { create } from 'zustand';
import { Photo, Tag, Category, Manufacturer, AppSettings } from './types';

interface GalleryState {
  photos: Photo[];
  tags: Tag[];
  categories: Category[];
  manufacturers: Manufacturer[];
  settings: AppSettings | null;
  cloudCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  
  // UI State migrated from GalleryContext
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
  isInfiniteMode: boolean;
  isStaffMode: boolean;
  user: any;
  isAdminMode: boolean;
  page: number;
  hasMore: boolean;
  totalCloudCount: number;
  
  // Actions
  setPhotos: (photos: Photo[] | ((prev: Photo[]) => Photo[])) => void;
  setTags: (tags: Tag[] | ((prev: Tag[]) => Tag[])) => void;
  setCategories: (categories: Category[] | ((prev: Category[]) => Category[])) => void;
  setManufacturers: (manufacturers: Manufacturer[] | ((prev: Manufacturer[]) => Manufacturer[])) => void;
  setSettings: (settings: AppSettings) => void;
  setCloudCount: (count: number) => void;
  setLastSyncTime: (time: string) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  
  setSearchQuery: (query: string) => void;
  setDebouncedSearchQuery: (query: string) => void;
  setFilterCatId: (id: string | null) => void;
  setFilterSubId: (id: string | null) => void;
  setFilterTagIds: (ids: string[]) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setIsMultiSelect: (isMulti: boolean) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  setShowGroupsCollapsed: (collapsed: boolean) => void;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
  setIsInfiniteMode: (isInfinite: boolean) => void;
  setIsStaffMode: (isStaff: boolean) => void;
  setUser: (user: any) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setHasMore: (hasMore: boolean) => void;
  setTotalCloudCount: (count: number) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  photos: [],
  tags: [],
  categories: [],
  manufacturers: [],
  settings: null,
  cloudCount: 0,
  lastSyncTime: null,
  isSyncing: false,

  searchQuery: '',
  debouncedSearchQuery: '',
  filterCatId: null,
  filterSubId: null,
  filterTagIds: [],
  sortOrder: 'desc',
  selectedIds: [],
  isMultiSelect: false,
  showGroupsCollapsed: true,
  visibleCount: 20,
  isInfiniteMode: false,
  isStaffMode: false,
  user: null,
  isAdminMode: false,
  page: 0,
  hasMore: true,
  totalCloudCount: 0,

  setPhotos: (photos) => set((state) => ({ 
    photos: typeof photos === 'function' ? photos(state.photos) : photos 
  })),
  setTags: (tags) => set((state) => ({ 
    tags: typeof tags === 'function' ? tags(state.tags) : tags 
  })),
  setCategories: (categories) => set((state) => ({ 
    categories: typeof categories === 'function' ? categories(state.categories) : categories 
  })),
  setManufacturers: (manufacturers) => set((state) => ({ 
    manufacturers: typeof manufacturers === 'function' ? manufacturers(state.manufacturers) : manufacturers 
  })),
  setSettings: (settings) => set({ settings }),
  setCloudCount: (cloudCount) => set({ cloudCount }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
  setFilterCatId: (filterCatId) => set({ filterCatId }),
  setFilterSubId: (filterSubId) => set({ filterSubId }),
  setFilterTagIds: (filterTagIds) => set({ filterTagIds }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  setSelectedIds: (ids) => set((state) => ({
    selectedIds: typeof ids === 'function' ? ids(state.selectedIds) : ids
  })),
  togglePhotoSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id) 
      ? state.selectedIds.filter(i => i !== id) 
      : [...state.selectedIds, id]
  })),
  clearSelection: () => set({ selectedIds: [], isMultiSelect: false }),
  setShowGroupsCollapsed: (showGroupsCollapsed) => set({ showGroupsCollapsed }),
  setVisibleCount: (visibleCount) => set((state) => ({
    visibleCount: typeof visibleCount === 'function' ? visibleCount(state.visibleCount) : visibleCount
  })),
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  setIsStaffMode: (isStaffMode) => set({ isStaffMode }),
  setUser: (user) => set({ user }),
  setIsAdminMode: (isAdminMode) => set({ isAdminMode }),
  setPage: (page) => set((state) => ({
    page: typeof page === 'function' ? page(state.page) : page
  })),
  setHasMore: (hasMore) => set({ hasMore }),
  setTotalCloudCount: (totalCloudCount) => set({ totalCloudCount }),
}));
