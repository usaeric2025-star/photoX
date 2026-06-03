import { create } from 'zustand';

export interface FiltersContext {
  categoryId: string | null;
  tagIds: string[];
  searchQuery: string;
  showGroupsCollapsed: boolean;
}

interface FiltersStore extends FiltersContext {
  setCategory: (categoryId: string | null) => void;
  setTags: (tagIds: string[]) => void;
  setSearch: (searchQuery: string) => void;
  setFilters: (filters: Partial<FiltersContext>) => void;
  setShowGroupsCollapsed: (showGroupsCollapsed: boolean) => void;
  resetFilters: () => void;
}

const useFiltersStore = create<FiltersStore>((set) => ({
  categoryId: null,
  tagIds: [],
  searchQuery: '',
  showGroupsCollapsed: true,
  
  setCategory: (categoryId) => set({ categoryId }),
  setTags: (tagIds) => set({ tagIds }),
  setSearch: (searchQuery) => set({ searchQuery }),
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),
  setShowGroupsCollapsed: (showGroupsCollapsed) => set({ showGroupsCollapsed }),
  resetFilters: () => set({ categoryId: null, tagIds: [], searchQuery: '', showGroupsCollapsed: true }),
}));

export function useFilters() {
  const store = useFiltersStore();
  return {
    filters: {
      categoryId: store.categoryId,
      tagIds: store.tagIds,
      searchQuery: store.searchQuery,
      showGroupsCollapsed: store.showGroupsCollapsed,
    },
    setCategory: store.setCategory,
    setTags: store.setTags,
    setSearch: store.setSearch,
    setFilters: store.setFilters,
    setShowGroupsCollapsed: store.setShowGroupsCollapsed,
    resetFilters: store.resetFilters,
  };
}
