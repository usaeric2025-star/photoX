import { create } from 'zustand';
import { AppSettings } from './types';

interface GalleryState {
  // UI State
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
  settings: AppSettings | null;
  
  // Actions
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
  setSettings: (settings: AppSettings | null) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
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
  settings: null,

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
  setSettings: (settings) => set({ settings }),
}));
